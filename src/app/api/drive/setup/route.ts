export const dynamic = "force-dynamic";

import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

interface SetupRequest {
    folderName?: string;
    tripNotes?: string;
}

interface SetupResponse {
    ok: boolean;
    data?: {
        folderId: string;
        folderUrl: string;
        sheetId: string;
    };
    error?: string;
}

function getGoogleOAuthClient() {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
    const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
        throw new Error("Missing Google OAuth environment variables");
    }

    const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri,
    );

    oauth2Client.setCredentials({
        refresh_token: refreshToken,
    });

    return oauth2Client;
}

async function createFolder(
    drive: ReturnType<typeof google.drive>,
    name: string,
    parentId: string,
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
    content: string,
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
    folderId: string,
): Promise<string> {
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

    await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "A1:C1",
        valueInputOption: "RAW",
        requestBody: {
            values: [["Image", "Filename", "Caption"]],
        },
    });

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
            requests: [{
                updateDimensionProperties: {
                    range: {
                        sheetId: 0,
                        dimension: "COLUMNS",
                        startIndex: 1,  // Column B (0-indexed)
                        endIndex: 2,
                    },
                    properties: {
                        pixelSize: 300,  // 3x default (~100)
                    },
                    fields: "pixelSize",
                },
            }],
        },
    });

    return sheetId;
}

export async function POST(
    request: NextRequest,
): Promise<NextResponse<SetupResponse>> {
    try {
        const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!parentFolderId) {
            return NextResponse.json(
                { ok: false, error: "Missing GOOGLE_DRIVE_FOLDER_ID" },
                { status: 500 },
            );
        }

        const body: SetupRequest = await request.json();
        const folderName = body.folderName?.trim();
        const tripNotes = body.tripNotes?.trim();

        if (!folderName) {
            return NextResponse.json(
                { ok: false, error: "folderName is required" },
                { status: 400 },
            );
        }

        const auth = getGoogleOAuthClient();
        const drive = google.drive({ version: "v3", auth });
        const sheets = google.sheets({ version: "v4", auth });

        const folderId = await createFolder(drive, folderName, parentFolderId);

        if (tripNotes) {
            await createTextFile(drive, folderId, "subtitle.txt", tripNotes);
        }

        const sheetId = await createCaptionsSheet(drive, sheets, folderId);
        const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;

        return NextResponse.json({
            ok: true,
            data: {
                folderId,
                folderUrl,
                sheetId,
            },
        });
    } catch (error) {
        console.error("Setup error:", error);
        return NextResponse.json(
            {
                ok: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
}
