// KREC (Kalamazoo College Recreational Center) API types

// Raw API response from Connect2MyCloud
export interface KrecLocationRaw {
    LocationId: number;
    LocationName: string;
    FacilityId: number;
    LastCount: number;
    TotalCapacity: number;
    IsClosed: boolean;
    LastUpdatedDateAndTime: string;
}

// Processed zone data
export interface KrecZone {
    id: number;
    name: string;
    facilityId: number;
    count: number;
    capacity: number;
    percentage: number;
    isClosed: boolean;
    lastUpdated: string;
}

// Our API response data
export interface KrecData {
    zones: KrecZone[];
    fetchedAt: string;
}

// Standard API response wrapper
export interface KrecAPIResponse {
    ok: boolean;
    data?: KrecData;
    error?: string;
    context?: string;
}
