export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSyncStatus } from "@/lib/bonvoyage-sync";

// TEMP DEBUG ROUTE — delete once the batched sync is confirmed working.
export async function GET(): Promise<NextResponse> {
    const status = await getSyncStatus();
    return NextResponse.json({ status });
}
