// Oura API Enhanced Tag response types
export interface OuraEnhancedTag {
    id: string;
    tag_type_code: string;
    start_time: string;
    end_time: string;
    start_day: string;
    end_day: string;
    comment?: string;
}

export interface OuraEnhancedTagResponse {
    data: OuraEnhancedTag[];
    next_token?: string;
}

// Cycle data types
export interface CycleStatistics {
    lengths: number[];           // Array of cycle lengths in days
    average: number | null;      // Average cycle length
    median: number | null;       // Median cycle length
    min: number | null;          // Shortest cycle
    max: number | null;          // Longest cycle
}

export type CyclePhase = 'Menstrual' | 'Follicular' | 'Ovulation' | 'Luteal';

export interface CycleData {
    currentCycleDay: number | null;          // Day X of current cycle
    currentPhase: CyclePhase | null;         // Current cycle phase
    cycleLength: number | null;              // Expected cycle length (median)
    statistics: CycleStatistics;             // Historical cycle statistics
    nextPeriodDate: string | null;           // ISO date string (YYYY-MM-DD)
    daysUntilNextPeriod: number | null;      // Days until next period
    progressPercentage: number | null;       // Percentage through current cycle (0-100)
    lastPeriodStart: string | null;          // ISO date string of last period
    periodStarts: string[];                  // Array of all period start dates
}

export interface CycleAPIResponse {
    ok: boolean;
    data?: CycleData;
    error?: string;
    context?: string;
}
