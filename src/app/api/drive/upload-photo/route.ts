export const dynamic = "force-dynamic";

import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

interface UploadPhotoRequest {
    folderId?: string;
    sheetId?: string;
    filename?: string;
    data?: string;
}

interface UploadPhotoResponse {
    ok: boolean;
    data?: {
        fileId: string;
        filename: string;
        webViewLink: string;
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

async function uploadPhoto(
    drive: ReturnType<typeof google.drive>,
    folderId: string,
    filename: string,
    base64Data: string,
): Promise<{ fileId: string; webViewLink: string }> {
    const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Content, "base64");

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

async function addSheetRow(
    sheets: ReturnType<typeof google.sheets>,
    spreadsheetId: string,
    filename: string,
    fileId: string,
): Promise<void> {
    const imageFormula = `=IMAGE("https://drive.google.com/uc?id=${fileId}")`;

    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "A2:C",
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: [[imageFormula, filename, ""]],
        },
    });
}

export async function POST(
    request: NextRequest,
): Promise<NextResponse<UploadPhotoResponse>> {
    try {
        const body: UploadPhotoRequest = await request.json();
        const folderId = body.folderId?.trim();
        const sheetId = body.sheetId?.trim();
        const filename = body.filename?.trim();
        const data = body.data;

        if (!folderId) {
            return NextResponse.json(
                { ok: false, error: "folderId is required" },
                { status: 400 },
            );
        }

        if (!sheetId) {
            return NextResponse.json(
                { ok: false, error: "sheetId is required" },
                { status: 400 },
            );
        }

        if (!filename) {
            return NextResponse.json(
                { ok: false, error: "filename is required" },
                { status: 400 },
            );
        }

        if (!data) {
            return NextResponse.json(
                { ok: false, error: "data is required" },
                { status: 400 },
            );
        }

        const auth = getGoogleAuth();
        const drive = google.drive({ version: "v3", auth });
        const sheets = google.sheets({ version: "v4", auth });

        const uploadResult = await uploadPhoto(drive, folderId, filename, data);
        await addSheetRow(sheets, sheetId, filename, uploadResult.fileId);

        return NextResponse.json({
            ok: true,
            data: {
                fileId: uploadResult.fileId,
                filename,
                webViewLink: uploadResult.webViewLink,
            },
        });
    } catch (error) {
        console.error("Upload photo error:", error);
        return NextResponse.json(
            {
                ok: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
}
