export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { syncFromDrive } from "@/lib/bonvoyage-sync";

// Manual, unscheduled escape hatch: the bon-voyage folders are frozen, so
// nothing calls this automatically. Hit it by hand (with the secret) if a
// trip folder is ever added to Drive in the future. Syncing all folders
// takes longer than the function timeout, so the sync runs via waitUntil
// and this returns immediately rather than waiting for it to finish.
export async function GET(request: NextRequest): Promise<NextResponse> {
    const authHeader = request.headers.get("authorization");
    if (
        !process.env.SYNC_SECRET ||
        authHeader !== `Bearer ${process.env.SYNC_SECRET}`
    ) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    waitUntil(
        syncFromDrive().catch((e) => console.error("Manual sync error:", e)),
    );

    return NextResponse.json({ ok: true, message: "Sync started" });
}
