"use client";
import { useState, useEffect } from "react";
import { KrecData, KrecZone } from "@/app/types/krec";

const TARGET_ZONES = ["Free Weight Zone", "Courtyard"];
const KREC_FACILITY_ID = 804;

const KrecCard = () => {
    const [krecData, setKrecData] = useState<KrecData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchKrecData = async () => {
            try {
                setLoading(true);
                const response = await fetch("/api/krec/occupancy");
                const result = await response.json();

                if (result.ok && result.data) {
                    setKrecData(result.data);
                    console.log("Fetched KREC data:", result.data);
                } else {
                    setError(result.error || "Failed to fetch KREC data");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        };

        fetchKrecData();
    }, []);

    // Filter by facility AND zone name, then sort
    const displayZones = krecData
        ? krecData.zones
              .filter((zone) => zone.facilityId === KREC_FACILITY_ID)
              .filter((zone) => TARGET_ZONES.includes(zone.name))
              .sort((a, b) => {
                  const order: { [key: string]: number } = {
                      "Free Weight": 0,
                      Courtyard: 1,
                  };
                  return (order[a.name] || 2) - (order[b.name] || 2);
              })
        : [];

    return (
        <div className="border-default rounded p-8 text-black">
            {loading ? (
                <div className="flex items-center justify-center min-h-[200px]">
                    <span className="font-louis text-lg">Loading...</span>
                </div>
            ) : error ? (
                <div className="flex items-center justify-center min-h-[200px]">
                    <span className="font-louis text-sm text-red-600">
                        Error: {error}
                    </span>
                </div>
            ) : displayZones.length > 0 ? (
                <div className="flex flex-col gap-1">
                    {/* Zones */}
                    <div className="flex flex-col gap-4 ">
                        {displayZones.map((zone) => (
                            <ZoneDisplay key={zone.id} zone={zone} />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center min-h-[200px]">
                    <span className="font-louis text-lg">
                        No occupancy data available
                    </span>
                </div>
            )}
        </div>
    );
};

const ZoneDisplay = ({ zone }: { zone: KrecZone }) => {
    const displayName = zone.name.toUpperCase();

    const formatLastUpdated = (isoString: string): string => {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return "Just now";
        if (diffMins === 1) return "1 min ago";
        if (diffMins < 60) return `${diffMins} min ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours === 1) return "1 hr ago";
        if (diffHours < 24) return `${diffHours} hr ago`;

        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return "1 day ago";
        return `${diffDays} days ago`;
    };

    return (
        <div className="flex flex-col gap-2">
            {/* Zone Name */}
            <div className="flex justify-end items-baseline gap-2">
                <span className="font-pixel text-[10pt]">{displayName}</span>
                {zone.isClosed && (
                    <span className="font-louis text-[8pt] text-gray-500">
                        CLOSED
                    </span>
                )}
            </div>

            {/* Progress Bar */}
            <div className="flex w-full bg-gray-200 rounded-full h-6 overflow-hidden items-center justify-between pr-2">
                <div
                    className="flex bg-black h-full transition-all duration-300 ease-out"
                    style={{ width: `${zone.percentage}%` }}
                />
                <span className="text-black font-louis text-[10pt] leading-none">
                    {zone.percentage}%
                </span>
            </div>

            {/* Last Updated */}
            <div className="flex justify-between items-baselin gap-1">
                {/* <span className="font-louis text-[9pt] text-gray-600 leading-none">
                    {zone.count} / {zone.capacity}
                </span> */}
                <span className="font-louis text-[9pt] text-gray-600 leading-none">
                    {formatLastUpdated(zone.lastUpdated)}
                </span>
            </div>
        </div>
    );
};

export default KrecCard;
