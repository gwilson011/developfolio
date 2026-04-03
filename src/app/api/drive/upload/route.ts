export const dynamic = "force-dynamic";

import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

interface UploadRequest {
    folderName?: string;
    folderId?: string;
    tripNotes?: string;
    photos: Array<{ filename: string; data: string }>;
}

interface UploadResponse {
    ok: boolean;
    data?: {
        folderId: string;
        folderUrl: string;
        sheetId: string;
        photosUploaded: number;
    };
    error?: string;
}

function getGoogleAuth() {
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_KEY");
    }

    const credentials = JSON.parse(serviceAccountKey);
    return new google.auth.GoogleAuth({
        credentials,
        scopes: [
            "https://www.googleapis.com/auth/drive",
            "https://www.googleapis.com/auth/spreadsheets",
        ],
    });
}

async function createFolder(
    drive: ReturnType<typeof google.drive>,
    name: string,
    parentId: string
): Promise<string> {
    const response = await drive.files.create({
        requestBody: {
            name,
            mimeType: "application/vnd.google-apps.folder",
            parents: [parentId],
        },
        fields: "id",
    });

    if (!response.data.id) {
        throw new Error("Failed to create folder");
    }

    return response.data.id;
}

async function createTextFile(
    drive: ReturnType<typeof google.drive>,
    folderId: string,
    filename: string,
    content: string
): Promise<string> {
    const response = await drive.files.create({
        requestBody: {
            name: filename,
            mimeType: "text/plain",
            parents: [folderId],
        },
        media: {
            mimeType: "text/plain",
            body: Readable.from([content]),
        },
        fields: "id",
    });

    if (!response.data.id) {
        throw new Error(`Failed to create ${filename}`);
    }

    return response.data.id;
}

async function createCaptionsSheet(
    drive: ReturnType<typeof google.drive>,
    sheets: ReturnType<typeof google.sheets>,
    folderId: string
): Promise<string> {
    // Create the spreadsheet
    const createResponse = await drive.files.create({
        requestBody: {
            name: "captions",
            mimeType: "application/vnd.google-apps.spreadsheet",
            parents: [folderId],
        },
        fields: "id",
    });

    const sheetId = createResponse.data.id;
    if (!sheetId) {
        throw new Error("Failed to create captions sheet");
    }

    // Add headers
    await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "A1:C1",
        valueInputOption: "RAW",
        requestBody: {
            values: [["Image", "Filename", "Caption"]],
        },
    });

    return sheetId;
}

async function uploadPhoto(
    drive: ReturnType<typeof google.drive>,
    folderId: string,
    filename: string,
    base64Data: string
): Promise<{ fileId: string; webViewLink: string }> {
    // Remove data URL prefix if present
    const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Content, "base64");

    // Determine mime type from filename
    const ext = filename.toLowerCase().split(".").pop();
    const mimeTypes: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        heic: "image/heic",
    };
    const mimeType = mimeTypes[ext || ""] || "image/jpeg";

    const response = await drive.files.create({
        requestBody: {
            name: filename,
            mimeType,
            parents: [folderId],
        },
        media: {
            mimeType,
            body: Readable.from([buffer]),
        },
        fields: "id,webViewLink",
    });

    if (!response.data.id) {
        throw new Error(`Failed to upload ${filename}`);
    }

    return {
        fileId: response.data.id,
        webViewLink: response.data.webViewLink || "",
    };
}

async function addSheetRows(
    sheets: ReturnType<typeof google.sheets>,
    spreadsheetId: string,
    photos: Array<{ filename: string; fileId: string }>
): Promise<void> {
    const rows = photos.map(({ filename, fileId }) => {
        const imageFormula = `=IMAGE("https://drive.google.com/uc?id=${fileId}")`;
        return [imageFormula, filename, ""];
    });

    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "A2:C",
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: rows,
        },
    });
}

async function findCaptionsSheet(
    drive: ReturnType<typeof google.drive>,
    folderId: string
): Promise<string | null> {
    const response = await drive.files.list({
        q: `'${folderId}' in parents and name = 'captions' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
        fields: "files(id)",
    });

    return response.data.files?.[0]?.id || null;
}

// GET /api/drive/upload - List folders for the add photos picker
export async function GET(): Promise<NextResponse> {
    try {
        const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!parentFolderId) {
            return NextResponse.json(
                { ok: false, error: "Missing GOOGLE_DRIVE_FOLDER_ID" },
                { status: 500 }
            );
        }

        const auth = getGoogleAuth();
        const drive = google.drive({ version: "v3", auth });

        const response = await drive.files.list({
            q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: "files(id, name)",
            orderBy: "createdTime desc",
        });

        const folders = (response.data.files || []).map((f) => ({
            id: f.id,
            name: f.name,
        }));

        return NextResponse.json({ ok: true, folders });
    } catch (error) {
        console.error("List folders error:", error);
        return NextResponse.json(
            {
                ok: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest
): Promise<NextResponse<UploadResponse>> {
    try {
        const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!parentFolderId) {
            return NextResponse.json(
                { ok: false, error: "Missing GOOGLE_DRIVE_FOLDER_ID" },
                { status: 500 }
            );
        }

        const body: UploadRequest = await request.json();
        const { folderName, folderId: existingFolderId, tripNotes, photos } = body;

        if (!folderName && !existingFolderId) {
            return NextResponse.json(
                { ok: false, error: "folderName or folderId is required" },
                { status: 400 }
            );
        }

        // Initialize Google APIs
        const auth = getGoogleAuth();
        const drive = google.drive({ version: "v3", auth });
        const sheets = google.sheets({ version: "v4", auth });

        let folderId: string;
        let sheetId: string;

        if (existingFolderId) {
            // Adding to existing folder
            folderId = existingFolderId;

            // Find existing captions sheet or create one
            const existingSheetId = await findCaptionsSheet(drive, folderId);
            if (existingSheetId) {
                sheetId = existingSheetId;
            } else {
                sheetId = await createCaptionsSheet(drive, sheets, folderId);
            }
        } else {
            // Creating new folder
            folderId = await createFolder(drive, folderName!, parentFolderId);

            // Create subtitle.txt if notes provided
            if (tripNotes && tripNotes.trim()) {
                await createTextFile(drive, folderId, "subtitle.txt", tripNotes.trim());
            }

            // Create captions sheet
            sheetId = await createCaptionsSheet(drive, sheets, folderId);
        }

        const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;

        // Upload photos
        const uploadedPhotos: Array<{ filename: string; fileId: string }> = [];

        for (const photo of photos || []) {
            const result = await uploadPhoto(
                drive,
                folderId,
                photo.filename,
                photo.data
            );
            uploadedPhotos.push({
                filename: photo.filename,
                fileId: result.fileId,
            });
        }

        // Add rows to captions sheet
        if (uploadedPhotos.length > 0) {
            await addSheetRows(sheets, sheetId, uploadedPhotos);
        }

        return NextResponse.json({
            ok: true,
            data: {
                folderId,
                folderUrl,
                sheetId,
                photosUploaded: uploadedPhotos.length,
            },
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            {
                ok: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
