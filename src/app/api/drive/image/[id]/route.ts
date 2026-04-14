export const dynamic = "force-dynamic";

import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { createDriveAuth } from "@/lib/google-auth";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    try {
        const { id } = await params;

        const auth = createDriveAuth(["https://www.googleapis.com/auth/drive.readonly"]);

        const drive = google.drive({ version: "v3", auth });

        // Get file metadata to determine content type
        const metadata = await drive.files.get({
            fileId: id,
            fields: "mimeType, name",
        });

        const mimeType = metadata.data.mimeType || "image/jpeg";

        // Download the file content
        const response = await drive.files.get(
            {
                fileId: id,
                alt: "media",
            },
            {
                responseType: "arraybuffer",
            },
        );

        const buffer = Buffer.from(response.data as ArrayBuffer);

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": mimeType,
                "Cache-Control": "public, max-age=86400, s-maxage=86400",
            },
        });
    } catch (error) {
        console.error("Image proxy error:", error);
        return NextResponse.json(
            { error: "Failed to fetch image" },
            { status: 500 },
        );
    }
}
