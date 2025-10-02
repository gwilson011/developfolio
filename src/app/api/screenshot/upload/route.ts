import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // disable caching

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("image") as File;

        if (!file) {
            return NextResponse.json(
                { ok: false, error: "No image file provided" },
                { status: 400 }
            );
        }

        // Validate file type
        if (!file.type.startsWith("image/")) {
            return NextResponse.json(
                { ok: false, error: "File must be an image" },
                { status: 400 }
            );
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { ok: false, error: "File size must be less than 10MB" },
                { status: 400 }
            );
        }

        try {
            // Convert file to base64 for OpenAI Vision API
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const base64 = buffer.toString('base64');
            const mimeType = file.type;
            const dataUrl = `data:${mimeType};base64,${base64}`;

            // For now, we'll return the data URL directly
            // In production, you might want to store the file temporarily
            return NextResponse.json({
                ok: true,
                imageData: dataUrl,
                fileName: file.name,
                size: file.size,
                type: file.type
            });

        } catch (error: unknown) {
            console.error("File processing error:", error instanceof Error ? error.message : 'Unknown error');
            return NextResponse.json(
                { ok: false, error: "Failed to process image file" },
                { status: 500 }
            );
        }

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error("[/api/screenshot/upload] error:", errorMessage);
        return NextResponse.json(
            { ok: false, error: errorMessage },
            { status: 500 }
        );
    }
}