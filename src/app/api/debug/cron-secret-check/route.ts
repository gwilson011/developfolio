export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

// TEMP DEBUG ROUTE — delete once the CRON_SECRET mismatch is resolved.
// Returns only booleans/lengths, never the actual secret value, so it's
// safe to leave publicly reachable for a few minutes while debugging.
export async function GET(): Promise<NextResponse> {
    const secret = process.env.CRON_SECRET;
    return NextResponse.json({
        isSet: !!secret,
        length: secret?.length ?? 0,
        matchesExpected: secret === "bonvoyage-sync-x7k2p9",
        trimmedMatchesExpected: secret?.trim() === "bonvoyage-sync-x7k2p9",
        startsWithExpected: secret?.startsWith("bonvoyage-sync-x7k2p9") ?? false,
    });
}
