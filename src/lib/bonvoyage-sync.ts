import { google } from "googleapis";
import fs from "fs/promises";
import path from "path";
import { Redis } from "@upstash/redis";
import type {
    BonVoyageData,
    BonVoyageFolder,
    FolderImage,
} from "@/app/types/bonvoyage";
import { createDriveAuth } from "@/lib/google-auth";

// Import static data as build-time fallback (bundled into serverless function)
import staticBonVoyageData from "@/data/bonvoyage-folders.json";

// Initialize Upstash Redis client
const redis = Redis.fromEnv();

const CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes
const CACHE_KEY = "bonvoyage-data";
const CACHE_TTL_SECONDS = 30 * 60; // 30 minutes

const FLOPPY_IMAGES = [
    "/bonvoyage/floppys/lightpink.png",
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

// Check if running on Vercel (serverless)
const isVercel = process.env.VERCEL === "1";

export async function readDataFile(): Promise<BonVoyageData> {
    // Try Redis cache first
    try {
        const cached = await redis.get<BonVoyageData>(CACHE_KEY);
        if (cached && !isCacheStale(cached.lastSynced)) {
            return cached;
        }
    } catch (e) {
        console.error("Redis read error:", e);
    }

    // In development, try to read from local file for fresh data
    if (!isVercel) {
        try {
            const localPath = path.join(
                process.cwd(),
                "src/data/bonvoyage-folders.json"
            );
            const data = await fs.readFile(localPath, "utf-8");
            const parsed = JSON.parse(data) as BonVoyageData;
            return parsed;
        } catch {
            // Fall through to static data
        }
    }

    // Fall back to static build-time data (bundled at deploy)
    return staticBonVoyageData as BonVoyageData;
}

export async function writeDataFile(data: BonVoyageData): Promise<void> {
    // Write to Redis cache
    try {
        await redis.set(CACHE_KEY, data, { ex: CACHE_TTL_SECONDS });
    } catch (e) {
        console.error("Redis write error:", e);
    }

    // In development, also write to local file for persistence
    if (!isVercel) {
        await fs.writeFile(
            path.join(process.cwd(), "src/data/bonvoyage-folders.json"),
            JSON.stringify(data, null, 4)
        );
    }
}

function hashStringToIndex(str: string, max: number): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % max;
}

export function getFloppyImageForId(folderId: string, usedImages: string[]): string {
    // Filter available images (not yet used by other folders)
    const availableImages = FLOPPY_IMAGES.filter(
        (img) => !usedImages.includes(img),
    );

    if (availableImages.length === 0) {
        // All colors used - deterministically pick based on folder ID
        const index = hashStringToIndex(folderId, FLOPPY_IMAGES.length);
        return FLOPPY_IMAGES[index];
    }

    // Pick from available colors deterministically based on folder ID
    const index = hashStringToIndex(folderId, availableImages.length);
    return availableImages[index];
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

// Helper functions for parallel folder processing
async function fetchSubtitle(
    drive: ReturnType<typeof google.drive>,
    folderId: string
): Promise<string | undefined> {
    const response = await drive.files.list({
        q: `'${folderId}' in parents and name = 'subtitle.txt' and trashed = false`,
        fields: "files(id)",
    });
    const file = response.data.files?.[0];
    if (!file?.id) return undefined;

    const content = await drive.files.get({ fileId: file.id, alt: "media" });
    return (content.data as string).trim();
}

async function fetchImages(
    drive: ReturnType<typeof google.drive>,
    folderId: string
) {
    const response = await drive.files.list({
        q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
        fields: "files(id, name)",
        orderBy: "name",
    });
    return response.data.files || [];
}

async function fetchCaptions(
    drive: ReturnType<typeof google.drive>,
    sheets: ReturnType<typeof google.sheets>,
    folderId: string
): Promise<Record<string, string>> {
    const sheetResponse = await drive.files.list({
        q: `'${folderId}' in parents and name = 'captions' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
        fields: "files(id)",
    });

    const sheet = sheetResponse.data.files?.[0];
    if (!sheet?.id) return {};

    try {
        const data = await sheets.spreadsheets.values.get({
            spreadsheetId: sheet.id,
            range: "B2:C",
        });
        const captionsMap: Record<string, string> = {};
        for (const row of data.data.values || []) {
            if (row[0] && row[1]) {
                captionsMap[row[0].toString().toLowerCase()] = row[1].toString();
            }
        }
        return captionsMap;
    } catch {
        return {};
    }
}

function buildImageList(
    driveImages: Array<{ id?: string | null; name?: string | null }>,
    captionsMap: Record<string, string>
): FolderImage[] {
    const images: FolderImage[] = [];
    for (const img of driveImages) {
        if (!img.id) continue;
        const originalName = img.name || "";
        const lookupKey = originalName.toLowerCase();
        const caption = captionsMap[lookupKey];

        images.push({
            id: img.id,
            name: originalName,
            url: getDriveImageUrl(img.id),
            caption,
        });
    }
    return images;
}

export async function syncFromDrive(): Promise<BonVoyageData> {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) {
        throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID");
    }

    const existingData = await readDataFile();

    const auth = createDriveAuth([
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/spreadsheets",
    ]);

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

    // Initialize new folders first (sequential to maintain floppy image assignment)
    for (const driveFolder of driveFolders) {
        if (!driveFolder.id || !driveFolder.name) continue;

        if (!existingData.folders[driveFolder.id]) {
            const floppyImage = getFloppyImageForId(driveFolder.id, usedImages);
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
    }

    // Process all folders in parallel (fetch subtitle, images, captions)
    const folderPromises = driveFolders.map(async (driveFolder) => {
        if (!driveFolder.id || !driveFolder.name) return;

        const folder = existingData.folders[driveFolder.id];

        // Fetch subtitle, images, and captions in parallel
        const [subtitleResult, imagesResult, captionsResult] = await Promise.all([
            fetchSubtitle(drive, folder.id),
            fetchImages(drive, folder.id),
            fetchCaptions(drive, sheets, folder.id),
        ]);

        folder.subtitle = subtitleResult;
        folder.images = buildImageList(imagesResult, captionsResult);
    });

    await Promise.all(folderPromises);

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
    if (
        Object.keys(data.folders).length === 0 ||
        isCacheStale(data.lastSynced)
    ) {
        return await syncFromDrive();
    }
    return data;
}
