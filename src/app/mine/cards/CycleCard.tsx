"use client";
import { useState, useEffect } from "react";
import { CycleData } from "@/app/types/oura";

const CycleCard = () => {
    const [cycleData, setCycleData] = useState<CycleData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCycleData = async () => {
            try {
                setLoading(true);
                const response = await fetch("/api/oura/cycle");
                const result = await response.json();

                if (result.ok && result.data) {
                    setCycleData(result.data);
                } else {
                    setError(result.error || "Failed to fetch cycle data");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        };

        fetchCycleData();
    }, []);

    return (
        <div className="border-default rounded p-8 text-black text-center">
            {loading ? (
                <div className="flex items-center justify-center">
                    <span className="font-louis text-lg">Loading...</span>
                </div>
            ) : error ? (
                <div className="flex items-center justify-center">
                    <span className="font-louis text-sm text-red-600">
                        Error: {error}
                    </span>
                </div>
            ) : cycleData && cycleData.currentCycleDay ? (
                <div className="flex flex-col gap-2 items-center justify-center">
                    <span className="font-pixel text-[8pt] leading-none">
                        DAY
                    </span>
                    <span className="font-tango text-[60pt] leading-none">
                        {cycleData.currentCycleDay}
                    </span>
                    <span className="font-louis text-[10pt] leading-none">
                        {cycleData.currentPhase?.toUpperCase()}
                    </span>
                </div>
            ) : (
                <div className="flex items-center justify-center">
                    <span className="font-louis text-lg">
                        No cycle data available
                    </span>
                </div>
            )}
        </div>
    );
};

export default CycleCard;
