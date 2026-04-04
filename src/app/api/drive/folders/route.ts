export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import type {
    BonVoyageFolder,
    BonVoyageAPIResponse,
} from "@/app/types/bonvoyage";
import {
    readDataFile,
    isCacheStale,
    syncFromDrive,
} from "@/lib/bonvoyage-sync";

export async function GET(
    request: NextRequest,
): Promise<NextResponse<BonVoyageAPIResponse>> {
    try {
        const forceSync =
            request.nextUrl.searchParams.get("forceSync") === "true";
        const existingData = await readDataFile();

        // Check if we can use cache (not stale and not force sync)
        if (
            !forceSync &&
            !isCacheStale(existingData.lastSynced) &&
            Object.keys(existingData.folders).length > 0
        ) {
            const allFolders: BonVoyageFolder[] = Object.values(
                existingData.folders,
            ).sort(
                (a, b) =>
                    new Date(b.createdTime).getTime() -
                    new Date(a.createdTime).getTime(),
            );

            return NextResponse.json({
                ok: true,
                data: {
                    current: allFolders[0] || null,
                    all: allFolders,
                    lastSynced: existingData.lastSynced,
                    fromCache: true,
                },
            });
        }

        // Need to sync from Drive
        const syncedData = await syncFromDrive();

        const allFolders: BonVoyageFolder[] = Object.values(
            syncedData.folders,
        ).sort(
            (a, b) =>
                new Date(b.createdTime).getTime() -
                new Date(a.createdTime).getTime(),
        );

        return NextResponse.json({
            ok: true,
            data: {
                current: allFolders[0] || null,
                all: allFolders,
                lastSynced: syncedData.lastSynced,
                fromCache: false,
            },
        });
    } catch (error) {
        console.error("Drive API error:", error);
        return NextResponse.json({
            ok: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
}
