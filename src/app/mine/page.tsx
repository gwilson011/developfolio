"use client";
import React from "react";
import CycleCard from "./cards/CycleCard";
import WorkoutCard from "./cards/WorkoutCard";
import DateCard from "./cards/DateCard";
import VocabCard from "./cards/VocabCard";
import KrecCard from "./cards/KrecCard";

export default function Home() {
    return (
        <div className="w-full h-screen flex flex-col justify-start items-center gap-3">
            <div className="flex justify-center flex-col p-4 md:p-0 md:items-end w-full h-full gap-3 flex-start md:mt-12 md:max-w-[60%] md:flex-row">
                <DateCard />
                <WorkoutCard />
                <CycleCard />
            </div>

            <div className="flex flex-col p-4 md:p-0 justify-center md:items-start w-full gap-3 flex-start md:max-w-[60%] md:h-screen md:flex-row">
                <VocabCard />
                <KrecCard />
            </div>
        </div>
    );
}
