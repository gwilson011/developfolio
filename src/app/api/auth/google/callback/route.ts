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

async function updateVercelEnvVar(refreshToken: string): Promise<{ success: boolean; error?: string }> {
    const vercelToken = process.env.VERCEL_API_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    const teamId = process.env.VERCEL_TEAM_ID;

    if (!vercelToken || !projectId) {
        return { success: false, error: "Missing VERCEL_API_TOKEN or VERCEL_PROJECT_ID" };
    }

    const baseUrl = "https://api.vercel.com";
    const teamQuery = teamId ? `?teamId=${teamId}` : "";
    const headers = {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
    };

    try {
        // Get existing env vars to find the ID
        const listResponse = await fetch(
            `${baseUrl}/v9/projects/${projectId}/env${teamQuery}`,
            { headers }
        );

        if (!listResponse.ok) {
            const error = await listResponse.text();
            return { success: false, error: `Failed to list env vars: ${error}` };
        }

        const { envs } = await listResponse.json();
        const existingVar = envs.find((env: { key: string }) => env.key === "GOOGLE_OAUTH_REFRESH_TOKEN");

        if (existingVar) {
            // Update existing env var
            const updateResponse = await fetch(
                `${baseUrl}/v9/projects/${projectId}/env/${existingVar.id}${teamQuery}`,
                {
                    method: "PATCH",
                    headers,
                    body: JSON.stringify({ value: refreshToken }),
                }
            );

            if (!updateResponse.ok) {
                const error = await updateResponse.text();
                return { success: false, error: `Failed to update env var: ${error}` };
            }
        } else {
            // Create new env var
            const createResponse = await fetch(
                `${baseUrl}/v9/projects/${projectId}/env${teamQuery}`,
                {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        key: "GOOGLE_OAUTH_REFRESH_TOKEN",
                        value: refreshToken,
                        type: "encrypted",
                        target: ["production", "preview", "development"],
                    }),
                }
            );

            if (!createResponse.ok) {
                const error = await createResponse.text();
                return { success: false, error: `Failed to create env var: ${error}` };
            }
        }

        // Trigger redeployment
        const deploymentsResponse = await fetch(
            `${baseUrl}/v6/deployments?projectId=${projectId}&limit=1${teamId ? `&teamId=${teamId}` : ""}`,
            { headers }
        );

        if (deploymentsResponse.ok) {
            const { deployments } = await deploymentsResponse.json();
            if (deployments?.[0]) {
                const latestDeployment = deployments[0];
                await fetch(
                    `${baseUrl}/v13/deployments${teamQuery}`,
                    {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                            name: projectId,
                            target: "production",
                            gitSource: latestDeployment.gitSource,
                        }),
                    }
                );
            }
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
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

        const refreshToken = tokens.refresh_token;
        if (!refreshToken) {
            return new NextResponse(
                `
                <html>
                    <body style="font-family: sans-serif; padding: 24px;">
                        <h1 style="color: #dc2626;">Error</h1>
                        <p>No refresh token returned. Try revoking app access in your Google Account and re-authorizing.</p>
                    </body>
                </html>
                `,
                { headers: { "Content-Type": "text/html" } },
            );
        }

        // Try to auto-update Vercel
        const vercelResult = await updateVercelEnvVar(refreshToken);

        if (vercelResult.success) {
            return new NextResponse(
                `
                <html>
                    <body style="font-family: sans-serif; padding: 24px;">
                        <h1 style="color: #16a34a;">✓ Token Updated Successfully</h1>
                        <p>The refresh token has been automatically updated in Vercel and a redeployment has been triggered.</p>
                        <p style="color: #6b7280; font-size: 14px;">You can close this window.</p>
                    </body>
                </html>
                `,
                { headers: { "Content-Type": "text/html" } },
            );
        }

        // Fallback: show token manually if Vercel update failed
        return new NextResponse(
            `
            <html>
                <body style="font-family: sans-serif; padding: 24px;">
                    <h1>Google OAuth Complete</h1>
                    <p style="color: #dc2626;">Auto-update failed: ${vercelResult.error}</p>
                    <p>Copy this refresh token into Vercel as <code>GOOGLE_OAUTH_REFRESH_TOKEN</code>:</p>
                    <pre style="white-space: pre-wrap; word-break: break-word; background: #f4f4f4; padding: 16px; border-radius: 8px;">${refreshToken}</pre>
                </body>
            </html>
            `,
            { headers: { "Content-Type": "text/html" } },
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
