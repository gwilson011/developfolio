export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSyncStatus } from "@/lib/bonvoyage-sync";

// Read-only health check for the Drive sync cron (see vercel.json). No
// secrets or cached data here, just operational metadata, so it's safe to
// leave publicly reachable as a quick way to confirm the daily sync is
// still running and keeping the Redis cache active.
export async function GET(): Promise<NextResponse> {
    const status = await getSyncStatus();
    return NextResponse.json({ status });
}
