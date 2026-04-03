export const dynamic = "force-dynamic";

import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import type {
    BonVoyageData,
    BonVoyageFolder,
    BonVoyageAPIResponse,
    FolderImage,
} from "@/app/types/bonvoyage";

const CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

const FLOPPY_IMAGES = [
    "/bonvoyage/floppys/lightpink.png",
    "/bonvoyage/floppys/white.png",
    "/bonvoyage/floppys/black.png",
    "/bonvoyage/floppys/orange.png",
    "/bonvoyage/floppys/pink.png",
    "/bonvoyage/floppys/darkgreen.png",
    "/bonvoyage/floppys/green.png",
    "/bonvoyage/floppys/navy.png",
    "/bonvoyage/floppys/cyan.png",
    "/bonvoyage/floppys/yellow.png",
    "/bonvoyage/floppys/purple.png",
    "/bonvoyage/floppys/red.png",
];

const DATA_FILE_PATH = path.join(
    process.cwd(),
    "src/data/bonvoyage-folders.json",
);

async function readDataFile(): Promise<BonVoyageData> {
    try {
        const data = await fs.readFile(DATA_FILE_PATH, "utf-8");
        return JSON.parse(data);
    } catch {
        return { folders: {}, lastSynced: "" };
    }
}

async function writeDataFile(data: BonVoyageData): Promise<void> {
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(data, null, 4));
}

function getRandomFloppyImage(usedImages: string[]): string {
    const availableImages = FLOPPY_IMAGES.filter(
        (img) => !usedImages.includes(img),
    );
    if (availableImages.length === 0) {
        // All images used, pick random from full list
        return FLOPPY_IMAGES[Math.floor(Math.random() * FLOPPY_IMAGES.length)];
    }
    return availableImages[Math.floor(Math.random() * availableImages.length)];
}

function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
}

function isCacheStale(lastSynced: string): boolean {
    if (!lastSynced) return true;
    const syncTime = new Date(lastSynced).getTime();
    return Date.now() - syncTime > CACHE_MAX_AGE_MS;
}

async function downloadAndProcessImage(
    drive: ReturnType<typeof google.drive>,
    fileId: string,
    destPath: string
): Promise<void> {
    const response = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "arraybuffer" }
    );

    await sharp(Buffer.from(response.data as ArrayBuffer))
        .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(destPath);
}

export async function GET(
    request: NextRequest,
): Promise<NextResponse<BonVoyageAPIResponse>> {
    try {
        const forceSync =
            request.nextUrl.searchParams.get("forceSync") === "true";
        const existingData = await readDataFile();

        // Check if we can use cache (not stale and not force sync)
        if (
            !forceSync &&
            !isCacheStale(existingData.lastSynced) &&
            Object.keys(existingData.folders).length > 0
        ) {
            // Return cached data
            const allFolders: BonVoyageFolder[] = Object.values(
                existingData.folders,
            ).sort(
                (a, b) =>
                    new Date(b.createdTime).getTime() -
                    new Date(a.createdTime).getTime(),
            );

            return NextResponse.json({
                ok: true,
                data: {
                    current: allFolders[0] || null,
                    all: allFolders,
                    lastSynced: existingData.lastSynced,
                    fromCache: true,
                },
            });
        }

        // Need to sync from Drive
        const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

        if (!serviceAccountKey || !folderId) {
            return NextResponse.json({
                ok: false,
                error: "Missing Google Drive configuration",
            });
        }

        // Initialize Google Drive client
        const credentials = JSON.parse(serviceAccountKey);
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: [
                "https://www.googleapis.com/auth/drive",
                "https://www.googleapis.com/auth/spreadsheets",
            ],
        });

        const drive = google.drive({ version: "v3", auth });
        const sheets = google.sheets({ version: "v4", auth });

        // List folders in the specified parent folder
        const response = await drive.files.list({
            q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: "files(id, name, createdTime)",
            orderBy: "createdTime desc",
        });

        const driveFolders = response.data.files || [];
        const usedImages = Object.values(existingData.folders).map(
            (f) => f.floppyImage,
        );

        // Process each Drive folder
        for (const driveFolder of driveFolders) {
            if (!driveFolder.id || !driveFolder.name) continue;

            if (!existingData.folders[driveFolder.id]) {
                // New folder - assign random floppy image
                const floppyImage = getRandomFloppyImage(usedImages);
                usedImages.push(floppyImage);

                existingData.folders[driveFolder.id] = {
                    id: driveFolder.id,
                    name: driveFolder.name,
                    slug: slugify(driveFolder.name),
                    floppyImage,
                    createdTime:
                        driveFolder.createdTime || new Date().toISOString(),
                };
            } else {
                // Ensure existing folders have slug (migration)
                if (!existingData.folders[driveFolder.id].slug) {
                    existingData.folders[driveFolder.id].slug = slugify(
                        existingData.folders[driveFolder.id].name,
                    );
                }
            }

            // Sync images for this folder
            const folder = existingData.folders[driveFolder.id];

            // Fetch subtitle.txt
            const subtitleResponse = await drive.files.list({
                q: `'${folder.id}' in parents and name = 'subtitle.txt' and trashed = false`,
                fields: "files(id)",
            });

            const subtitleFile = subtitleResponse.data.files?.[0];
            if (subtitleFile?.id) {
                const content = await drive.files.get({
                    fileId: subtitleFile.id,
                    alt: "media",
                });
                folder.subtitle = (content.data as string).trim();
            }

            // Fetch all images from the folder
            const imagesResponse = await drive.files.list({
                q: `'${folder.id}' in parents and mimeType contains 'image/' and trashed = false`,
                fields: "files(id, name)",
                orderBy: "name",
            });

            const driveImages = imagesResponse.data.files || [];

            // Fetch captions from Google Sheet named "captions"
            const captionsSheetResponse = await drive.files.list({
                q: `'${folder.id}' in parents and name = 'captions' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
                fields: "files(id)",
            });

            const captionsMap: Record<string, string> = {};
            const captionsSheet = captionsSheetResponse.data.files?.[0];

            if (captionsSheet?.id) {
                try {
                    const sheetData = await sheets.spreadsheets.values.get({
                        spreadsheetId: captionsSheet.id,
                        range: "B2:C",
                    });

                    const rows = sheetData.data.values || [];
                    for (const row of rows) {
                        if (row[0] && row[1]) {
                            captionsMap[row[0].toString().toLowerCase()] =
                                row[1].toString();
                        }
                    }
                } catch (sheetError) {
                    console.error("Error reading captions sheet:", sheetError);
                }
            }

            // Build image list - download and serve locally
            const images: FolderImage[] = [];
            const imagesDir = path.join(
                process.cwd(),
                "public/bonvoyage/images",
                folder.slug
            );
            await fs.mkdir(imagesDir, { recursive: true });

            // Track which files should exist
            const expectedFiles = new Set<string>();

            for (const img of driveImages) {
                const originalName = img.name || "";
                const caption = captionsMap[originalName.toLowerCase()];
                // Change extension to .webp
                const webpName = originalName.replace(/\.[^.]+$/, ".webp");
                const localPath = `/bonvoyage/images/${folder.slug}/${webpName}`;
                const fullPath = path.join(imagesDir, webpName);

                expectedFiles.add(webpName);

                // Download and convert if not already cached
                const exists = await fs
                    .access(fullPath)
                    .then(() => true)
                    .catch(() => false);
                if (!exists) {
                    await downloadAndProcessImage(drive, img.id!, fullPath);
                }

                images.push({
                    id: img.id!,
                    name: originalName,
                    url: localPath,
                    caption,
                });
            }

            // Clean up deleted images - remove local files not in Drive
            const localFiles = await fs.readdir(imagesDir).catch(() => []);
            for (const localFile of localFiles) {
                if (!expectedFiles.has(localFile)) {
                    await fs
                        .unlink(path.join(imagesDir, localFile))
                        .catch(() => {});
                }
            }

            folder.images = images;
        }

        // Remove folders that no longer exist in Drive
        const driveFolderIds = new Set(driveFolders.map((df) => df.id));
        for (const folderId of Object.keys(existingData.folders)) {
            if (!driveFolderIds.has(folderId)) {
                // Clean up local images for deleted folder
                const deletedFolder = existingData.folders[folderId];
                const deletedImagesDir = path.join(
                    process.cwd(),
                    "public/bonvoyage/images",
                    deletedFolder.slug
                );
                await fs
                    .rm(deletedImagesDir, { recursive: true, force: true })
                    .catch(() => {});

                delete existingData.folders[folderId];
            }
        }

        // Update lastSynced timestamp
        existingData.lastSynced = new Date().toISOString();

        // Write updated data
        await writeDataFile(existingData);

        // Get all folders sorted by createdTime (newest first)
        const allFolders: BonVoyageFolder[] = Object.values(
            existingData.folders,
        ).sort(
            (a, b) =>
                new Date(b.createdTime).getTime() -
                new Date(a.createdTime).getTime(),
        );

        return NextResponse.json({
            ok: true,
            data: {
                current: allFolders[0] || null,
                all: allFolders,
                lastSynced: existingData.lastSynced,
                fromCache: false,
            },
        });
    } catch (error) {
        console.error("Drive API error:", error);
        return NextResponse.json({
            ok: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
}
