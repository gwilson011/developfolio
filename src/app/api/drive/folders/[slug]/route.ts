export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import type { FolderDetailResponse } from "@/app/types/bonvoyage";
import { getOrSyncData } from "@/lib/bonvoyage-sync";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse<FolderDetailResponse>> {
    try {
        const { slug } = await params;

        // Will sync from Drive if cache is empty or stale
        const data = await getOrSyncData();

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
