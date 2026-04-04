export const dynamic = "force-dynamic";

import { google } from "googleapis";
import { NextResponse } from "next/server";

function getOAuthClient() {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error("Missing Google OAuth environment variables");
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function GET() {
    try {
        const oauth2Client = getOAuthClient();

        const scopes = [
            "https://www.googleapis.com/auth/drive",
            "https://www.googleapis.com/auth/spreadsheets",
        ];

        const url = oauth2Client.generateAuthUrl({
            access_type: "offline",
            scope: scopes,
            prompt: "consent",
        });

        return NextResponse.redirect(url);
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
}
