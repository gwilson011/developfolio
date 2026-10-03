export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import type { FolderDetailResponse } from "@/app/types/bonvoyage";
import { readDataFile, isCacheStale, syncFromDrive } from "@/lib/bonvoyage-sync";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse<FolderDetailResponse>> {
    try {
        const { slug } = await params;

        // Never block on a live Drive sync here (it can exceed the function
        // timeout) — serve the cache and let the cron job keep it fresh.
        const data = await readDataFile();
        if (
            Object.keys(data.folders).length === 0 ||
            isCacheStale(data.lastSynced)
        ) {
            waitUntil(
                syncFromDrive().catch((e) =>
                    console.error("Background sync error:", e),
                ),
            );
        }

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
