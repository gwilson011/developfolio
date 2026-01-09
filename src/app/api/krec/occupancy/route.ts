import { NextResponse } from "next/server";
import { handleAPIError, safeAsyncOperation } from "@/utils/error-handling";
import { KrecLocationRaw, KrecData, KrecZone } from "@/app/types/krec";

export const dynamic = "force-dynamic";

// Constants
const KREC_API_URL = "https://goboardapi.azurewebsites.net/api/FacilityCount/GetCountsByAccount?AccountAPIKey=73829a91-48cb-4b7b-bd0b-8cf4134c04cd";
const FETCH_TIMEOUT = 30000; // 30 seconds

export async function GET() {
    try {
        // 1. Fetch data from external API
        const locationsResult = await safeAsyncOperation(async () => {
            const response = await fetch(KREC_API_URL, {
                signal: AbortSignal.timeout(FETCH_TIMEOUT),
                headers: {
                    'Accept': 'application/json'
                },
                cache: 'no-store',
            });

            if (!response.ok) {
                throw new Error(`KREC API error: ${response.status} ${response.statusText}`);
            }

            const rawData: KrecLocationRaw[] = await response.json();
            return rawData;
        }, [], "fetchKrecOccupancy");

        if (!locationsResult.success) {
            return NextResponse.json({
                ok: false,
                error: "Failed to fetch occupancy data from KREC API",
                context: '/api/krec/occupancy'
            }, { status: 503 });
        }

        const locations = locationsResult.data!;

        // 2. Transform ALL locations (no filtering)
        const zones: KrecZone[] = locations.map(loc => {
            // Calculate percentage, handle division by zero
            const percentage = loc.TotalCapacity > 0
                ? Math.round((loc.LastCount / loc.TotalCapacity) * 100)
                : 0;

            return {
                id: loc.LocationId,
                name: loc.LocationName,
                facilityId: loc.FacilityId,
                count: loc.LastCount,
                capacity: loc.TotalCapacity,
                percentage: Math.min(100, Math.max(0, percentage)), // Clamp 0-100
                isClosed: loc.IsClosed,
                lastUpdated: loc.LastUpdatedDateAndTime
            };
        });

        // 3. Build response
        const krecData: KrecData = {
            zones,
            fetchedAt: new Date().toISOString()
        };

        return NextResponse.json({ ok: true, data: krecData });

    } catch (error) {
        return handleAPIError(error, '/api/krec/occupancy', "Failed to fetch KREC occupancy data");
    }
}
