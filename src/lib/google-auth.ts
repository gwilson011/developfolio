import { google } from "googleapis";

/**
 * Parse the Google service account key from environment variable.
 * Handles common formatting issues like literal newlines in the private key.
 */
export function parseServiceAccountKey(): Record<string, unknown> {
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountKey) {
        throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_KEY environment variable");
    }

    try {
        return JSON.parse(serviceAccountKey);
    } catch {
        // If parsing fails, try fixing literal newlines in the JSON string
        // (common when private_key contains unescaped newlines from env var copy-paste)
        const fixedKey = serviceAccountKey.replace(/\n/g, "\\n");
        return JSON.parse(fixedKey);
    }
}

/**
 * Create a Google Auth client for Drive API access.
 */
export function createDriveAuth(scopes: string[] = ["https://www.googleapis.com/auth/drive.readonly"]) {
    const credentials = parseServiceAccountKey();
    return new google.auth.GoogleAuth({
        credentials,
        scopes,
    });
}
