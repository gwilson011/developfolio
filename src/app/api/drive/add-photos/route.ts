export const dynamic = "force-dynamic";

import { google } from "googleapis";
import { NextResponse } from "next/server";

interface FolderWithSheet {
    id: string;
    name: string;
    sheetId: string;
}

interface AddPhotosResponse {
    ok: boolean;
    folders?: FolderWithSheet[];
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

async function findCaptionsSheet(
    drive: ReturnType<typeof google.drive>,
    folderId: string,
): Promise<string | null> {
    const response = await drive.files.list({
        q: `'${folderId}' in parents and name = 'captions' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
        fields: "files(id)",
    });
    return response.data.files?.[0]?.id || null;
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

    return sheetId;
}

export async function GET(): Promise<NextResponse<AddPhotosResponse>> {
    try {
        const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!parentFolderId) {
            return NextResponse.json(
                { ok: false, error: "Missing GOOGLE_DRIVE_FOLDER_ID" },
                { status: 500 },
            );
        }

        const auth = getGoogleOAuthClient();
        const drive = google.drive({ version: "v3", auth });
        const sheets = google.sheets({ version: "v4", auth });

        // List all subfolders in the parent folder
        const foldersResponse = await drive.files.list({
            q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: "files(id, name)",
            orderBy: "createdTime desc",
        });

        const folders = foldersResponse.data.files || [];
        const foldersWithSheets: FolderWithSheet[] = [];

        // For each folder, find or create the captions sheet
        for (const folder of folders) {
            if (!folder.id || !folder.name) continue;

            let sheetId = await findCaptionsSheet(drive, folder.id);

            if (!sheetId) {
                sheetId = await createCaptionsSheet(drive, sheets, folder.id);
            }

            foldersWithSheets.push({
                id: folder.id,
                name: folder.name,
                sheetId,
            });
        }

        return NextResponse.json({
            ok: true,
            folders: foldersWithSheets,
        });
    } catch (error) {
        console.error("Add photos error:", error);
        return NextResponse.json(
            {
                ok: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
}
