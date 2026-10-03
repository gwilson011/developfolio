export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { syncFromDrive } from "@/lib/bonvoyage-sync";

// Invoked on a schedule by Vercel Cron (see vercel.json), which sends
// `Authorization: Bearer ${CRON_SECRET}` automatically. Can also be hit by
// hand with the same secret for an immediate resync. Syncing all folders
// takes longer than the function timeout, so the sync runs via waitUntil
// and this returns immediately rather than waiting for it to finish.
export async function GET(request: NextRequest): Promise<NextResponse> {
    const authHeader = request.headers.get("authorization");
    if (
        !process.env.CRON_SECRET ||
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    waitUntil(
        syncFromDrive().catch((e) => console.error("Manual sync error:", e)),
    );

    return NextResponse.json({ ok: true, message: "Sync started" });
}
