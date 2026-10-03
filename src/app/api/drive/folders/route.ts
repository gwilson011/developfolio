export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type {
    BonVoyageFolder,
    BonVoyageAPIResponse,
} from "@/app/types/bonvoyage";
import { readDataFile } from "@/lib/bonvoyage-sync";

// The Drive folder is frozen (no new trips expected), so this just serves
// whatever is cached — never triggers a live sync. A full sync takes
// longer than the function timeout anyway; see /api/drive/sync for the
// manual, unscheduled resync path to use if a folder is ever added.
export async function GET(): Promise<NextResponse<BonVoyageAPIResponse>> {
    try {
        const existingData = await readDataFile();

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
