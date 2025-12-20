import { NextResponse } from "next/server";
import { handleAPIError, safeAsyncOperation, validateEnvironment } from "@/utils/error-handling";
import { CycleData, CyclePhase, CycleStatistics, OuraEnhancedTagResponse } from "@/app/types/oura";

export const dynamic = "force-dynamic";

/**
 * Group consecutive period days into distinct periods
 * Returns the first day of each period
 */
function groupPeriodDays(periodDates: Date[]): Date[] {
    if (periodDates.length === 0) return [];

    const sorted = [...periodDates].sort((a, b) => a.getTime() - b.getTime());
    const periods: Date[][] = [];
    let currentPeriod = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
        const daysDiff = Math.floor(
            (sorted[i].getTime() - sorted[i-1].getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff === 1) {
            currentPeriod.push(sorted[i]);
        } else {
            periods.push(currentPeriod);
            currentPeriod = [sorted[i]];
        }
    }
    periods.push(currentPeriod);

    return periods.map(period => period[0]);
}

/**
 * Calculate cycle statistics from period starts
 */
function calculateCycleStatistics(periodStarts: Date[]): CycleStatistics {
    if (periodStarts.length < 2) {
        return {
            lengths: [],
            average: null,
            median: null,
            min: null,
            max: null
        };
    }

    const lengths = periodStarts
        .slice(0, -1)
        .map((start, i) => {
            const next = periodStarts[i + 1];
            return Math.floor((next.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        });

    const average = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    const sorted = [...lengths].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

    return {
        lengths,
        average: Math.round(average * 10) / 10,
        median: Math.round(median * 10) / 10,
        min: Math.min(...lengths),
        max: Math.max(...lengths)
    };
}

/**
 * Determine cycle phase based on current cycle day
 */
function getCyclePhase(cycleDay: number, avgCycleLength: number): CyclePhase {
    if (cycleDay <= 5) {
        return 'Menstrual';
    } else if (cycleDay <= Math.floor(avgCycleLength * 0.52)) {
        return 'Follicular';
    } else if (cycleDay <= Math.floor(avgCycleLength * 0.64)) {
        return 'Ovulation';
    } else {
        return 'Luteal';
    }
}

/**
 * Predict next period date and days until
 */
function predictNextPeriod(lastStart: Date, medianLength: number | null): {
    nextPeriodDate: string | null;
    daysUntilNextPeriod: number | null;
} {
    if (!medianLength) {
        return { nextPeriodDate: null, daysUntilNextPeriod: null };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let predicted = new Date(lastStart);
    predicted.setDate(predicted.getDate() + Math.round(medianLength));

    // If predicted is in the past, add median until future
    while (predicted <= today) {
        predicted.setDate(predicted.getDate() + Math.round(medianLength));
    }

    const daysUntil = Math.floor((predicted.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return {
        nextPeriodDate: predicted.toISOString().split('T')[0],
        daysUntilNextPeriod: daysUntil
    };
}

export async function GET() {
    try {
        // 1. Validate environment
        const envError = validateEnvironment(['OURA_PAT'], '/api/oura/cycle');
        if (envError) return envError;

        // 2. Calculate date range (270 days back)
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 270);

        const todayStr = today.toISOString().split('T')[0];
        const startDateStr = startDate.toISOString().split('T')[0];

        // 3. Fetch period tags from Oura API
        const periodDatesResult = await safeAsyncOperation(async () => {
            const response = await fetch(
                `https://api.ouraring.com/v2/usercollection/enhanced_tag?start_date=${startDateStr}&end_date=${todayStr}`,
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.OURA_PAT}`,
                        'Content-Type': 'application/json'
                    },
                    signal: AbortSignal.timeout(30000)
                }
            );

            if (!response.ok) {
                throw new Error(`Oura API error: ${response.status} ${response.statusText}`);
            }

            const data: OuraEnhancedTagResponse = await response.json();

            // Filter for period tags and extract dates
            const periodTags = data.data.filter(tag => tag.tag_type_code === 'tag_generic_period');
            const dates = periodTags
                .map(tag => new Date(tag.start_day))
                .filter((date, index, self) =>
                    // Deduplicate
                    self.findIndex(d => d.getTime() === date.getTime()) === index
                )
                .sort((a, b) => a.getTime() - b.getTime());

            return dates;
        }, [], "fetchOuraPeriodTags");

        if (!periodDatesResult.success) {
            return NextResponse.json({
                ok: false,
                error: "Failed to fetch period data from Oura API",
                context: '/api/oura/cycle'
            }, { status: 503 });
        }

        const periodDates = periodDatesResult.data!;

        // 4. Group consecutive period days into distinct periods
        const periodStarts = groupPeriodDays(periodDates);

        // 5. Handle edge case: no periods found
        if (periodStarts.length === 0) {
            return NextResponse.json({
                ok: true,
                data: {
                    currentCycleDay: null,
                    currentPhase: null,
                    cycleLength: null,
                    statistics: {
                        lengths: [],
                        average: null,
                        median: null,
                        min: null,
                        max: null
                    },
                    nextPeriodDate: null,
                    daysUntilNextPeriod: null,
                    progressPercentage: null,
                    lastPeriodStart: null,
                    periodStarts: []
                } as CycleData
            });
        }

        // 6. Calculate cycle statistics
        const statistics = calculateCycleStatistics(periodStarts);

        // 7. Find last period start and calculate current cycle day
        today.setHours(0, 0, 0, 0);
        const lastStart = periodStarts
            .filter(date => date <= today)
            .sort((a, b) => b.getTime() - a.getTime())[0];

        let currentCycleDay: number | null = null;
        let currentPhase: CyclePhase | null = null;
        let progressPercentage: number | null = null;

        if (lastStart) {
            currentCycleDay = Math.floor((today.getTime() - lastStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            if (statistics.average) {
                currentPhase = getCyclePhase(currentCycleDay, statistics.average);
            }

            if (statistics.median) {
                progressPercentage = Math.min(100, Math.round((currentCycleDay / statistics.median) * 100));
            }
        }

        // 8. Predict next period
        const prediction = lastStart && statistics.median
            ? predictNextPeriod(lastStart, statistics.median)
            : { nextPeriodDate: null, daysUntilNextPeriod: null };

        // 9. Build response
        const cycleData: CycleData = {
            currentCycleDay,
            currentPhase,
            cycleLength: statistics.median,
            statistics,
            nextPeriodDate: prediction.nextPeriodDate,
            daysUntilNextPeriod: prediction.daysUntilNextPeriod,
            progressPercentage,
            lastPeriodStart: lastStart ? lastStart.toISOString().split('T')[0] : null,
            periodStarts: periodStarts.map(date => date.toISOString().split('T')[0])
        };

        return NextResponse.json({ ok: true, data: cycleData });

    } catch (error) {
        return handleAPIError(error, '/api/oura/cycle', "Failed to fetch cycle data");
    }
}
