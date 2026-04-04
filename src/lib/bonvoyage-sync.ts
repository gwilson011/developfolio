import { google } from "googleapis";
import fs from "fs/promises";
import path from "path";
import type {
    BonVoyageData,
    BonVoyageFolder,
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

// Use /tmp on Vercel (serverless), fallback to src/data locally
const isVercel = process.env.VERCEL === "1";
const DATA_FILE_PATH = isVercel
    ? "/tmp/bonvoyage-folders.json"
    : path.join(process.cwd(), "src/data/bonvoyage-folders.json");

export async function readDataFile(): Promise<BonVoyageData> {
    try {
        const data = await fs.readFile(DATA_FILE_PATH, "utf-8");
        return JSON.parse(data);
    } catch {
        return { folders: {}, lastSynced: "" };
    }
}

export async function writeDataFile(data: BonVoyageData): Promise<void> {
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(data, null, 4));
}

export function getRandomFloppyImage(usedImages: string[]): string {
    const availableImages = FLOPPY_IMAGES.filter(
        (img) => !usedImages.includes(img),
    );
    if (availableImages.length === 0) {
        return FLOPPY_IMAGES[Math.floor(Math.random() * FLOPPY_IMAGES.length)];
    }
    return availableImages[Math.floor(Math.random() * availableImages.length)];
}

export function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
}

export function isCacheStale(lastSynced: string): boolean {
    if (!lastSynced) return true;
    const syncTime = new Date(lastSynced).getTime();
    return Date.now() - syncTime > CACHE_MAX_AGE_MS;
}

// Generate proxied image URL through our API
export function getDriveImageUrl(fileId: string): string {
    return `/api/drive/image/${fileId}`;
}

export async function syncFromDrive(): Promise<BonVoyageData> {
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!serviceAccountKey || !folderId) {
        throw new Error("Missing Google Drive configuration");
    }

    const existingData = await readDataFile();

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
            if (!existingData.folders[driveFolder.id].slug) {
                existingData.folders[driveFolder.id].slug = slugify(
                    existingData.folders[driveFolder.id].name,
                );
            }
        }

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

        // Build image list - serve directly from Google Drive
        const images: FolderImage[] = [];

        for (const img of driveImages) {
            const originalName = img.name || "";
            const caption = captionsMap[originalName.toLowerCase()];

            images.push({
                id: img.id!,
                name: originalName,
                url: getDriveImageUrl(img.id!),
                caption,
            });
        }

        folder.images = images;
    }

    // Remove folders that no longer exist in Drive
    const driveFolderIds = new Set(driveFolders.map((df) => df.id));
    for (const folderId of Object.keys(existingData.folders)) {
        if (!driveFolderIds.has(folderId)) {
            delete existingData.folders[folderId];
        }
    }

    existingData.lastSynced = new Date().toISOString();
    await writeDataFile(existingData);

    return existingData;
}

export async function getOrSyncData(): Promise<BonVoyageData> {
    const data = await readDataFile();
    if (Object.keys(data.folders).length === 0 || isCacheStale(data.lastSynced)) {
        return await syncFromDrive();
    }
    return data;
}
