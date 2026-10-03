export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import type { FolderDetailResponse } from "@/app/types/bonvoyage";
import { readDataFile } from "@/lib/bonvoyage-sync";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse<FolderDetailResponse>> {
    try {
        const { slug } = await params;

        // Drive folder is frozen — just serve the cache, no live sync.
        const data = await readDataFile();

        // Find folder by slug
        const folder = Object.values(data.folders).find(
            (f) => f.slug === slug,
        );

        if (!folder) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "FOLDER NOT FOUND",
                },
                { status: 404 },
            );
        }

        // Return cached data - images are already synced
        return NextResponse.json({
            ok: true,
            data: {
                folder,
                images: folder.images || [],
            },
        });
    } catch (error) {
        console.error("Folder detail error:", error);
        return NextResponse.json(
            {
                ok: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
}
