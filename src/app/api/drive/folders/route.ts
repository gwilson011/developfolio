export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import type {
    BonVoyageFolder,
    BonVoyageAPIResponse,
} from "@/app/types/bonvoyage";
import { readDataFile, isCacheStale, syncFromDrive } from "@/lib/bonvoyage-sync";

// A full Drive sync takes longer than the function timeout, so this route
// never syncs inline — it only ever reads the cache. Freshness is kept up
// by the /api/drive/sync cron job; as a fallback, a stale cache also kicks
// off a background sync here (via waitUntil) without blocking the response.
export async function GET(): Promise<NextResponse<BonVoyageAPIResponse>> {
    try {
        const existingData = await readDataFile();

        if (isCacheStale(existingData.lastSynced)) {
            waitUntil(
                syncFromDrive().catch((e) =>
                    console.error("Background sync error:", e),
                ),
            );
        }

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
    } catch (error) {
        console.error("Drive API error:", error);
        return NextResponse.json({
            ok: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
}
