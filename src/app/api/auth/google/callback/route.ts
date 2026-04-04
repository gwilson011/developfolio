export const dynamic = "force-dynamic";

import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

function getOAuthClient() {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error("Missing Google OAuth environment variables");
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function GET(request: NextRequest) {
    try {
        const code = request.nextUrl.searchParams.get("code");
        if (!code) {
            return NextResponse.json(
                { ok: false, error: "Missing code" },
                { status: 400 },
            );
        }

        const oauth2Client = getOAuthClient();
        const { tokens } = await oauth2Client.getToken(code);

        return new NextResponse(
            `
      <html>
        <body style="font-family: sans-serif; padding: 24px;">
          <h1>Google OAuth complete</h1>
          <p>Copy this refresh token into <code>.env.local</code> as <code>GOOGLE_OAUTH_REFRESH_TOKEN</code>.</p>
          <pre style="white-space: pre-wrap; word-break: break-word; background: #f4f4f4; padding: 16px; border-radius: 8px;">${tokens.refresh_token ?? "NO_REFRESH_TOKEN_RETURNED"}</pre>
          <p>Access token:</p>
          <pre style="white-space: pre-wrap; word-break: break-word; background: #f4f4f4; padding: 16px; border-radius: 8px;">${tokens.access_token ?? ""}</pre>
        </body>
      </html>
      `,
            {
                headers: { "Content-Type": "text/html" },
            },
        );
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
