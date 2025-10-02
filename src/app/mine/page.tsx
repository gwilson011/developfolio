"use client";
import React from "react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Masonry } from "@mui/lab";
import CircularProgress, {
    circularProgressClasses,
} from "@mui/material/CircularProgress";
import { CircularProgressWithLabel } from "../components/CircularProgressWithLabel";

interface WorkoutData {
    workout_plan: {
        [key: string]: {
            title: string;
            duration?: string;
            exercises: any[];
            notes?: string;
        };
    };
}

export default function Home() {
    const [hover, setHover] = useState<string>("");
    const [workoutData, setWorkoutData] = useState<WorkoutData | null>(null);

    useEffect(() => {
        const fetchWorkoutData = async () => {
            try {
                const response = await fetch("/workout_schedule.json");
                const data = await response.json();
                setWorkoutData(data);
            } catch (error) {
                console.error("Failed to fetch workout data:", error);
            }
        };

        fetchWorkoutData();
    }, []);

    // Get current day's workout data
    const getCurrentDayWorkout = () => {
        if (!workoutData) return null;

        const currentDay = new Date().toLocaleDateString("en-US", {
            weekday: "long",
        });
        return workoutData.workout_plan[currentDay] || null;
    };

    const todayWorkout = getCurrentDayWorkout();

    return (
        <div className="w-full h-full flex flex-col justify-start items-center">
            <div className="flex flex-col md:flex-row p-4 justify-center items-center w-full md:max-w-[60%] md:h-screen gap-3">
                {/* <Masonry columns={2} spacing={2}> */}
                <div className="border-default rounded p-10 text-black text-center">
                    <div className="flex flex-col gap-2">
                        <span className="font-tango text-[40pt] leading-none">
                            {new Date()
                                .toLocaleDateString("en-US", {
                                    weekday: "short",
                                })
                                .toUpperCase()}
                        </span>
                        <span className="font-louis text-lg">
                            {new Date().toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </span>
                    </div>
                </div>
                <div className="border-default rounded p-10 text-black text-center">
                    {todayWorkout ? (
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-0">
                                <span className="font-louis leading-none">
                                    {new Date()
                                        .toLocaleDateString("en-US", {
                                            weekday: "long",
                                        })
                                        .toUpperCase()}
                                </span>
                                <span className="font-tango text-[24pt]">
                                    {todayWorkout.title}
                                </span>
                                <span className="font-louis text-sm text-gray-600">
                                    {todayWorkout.duration || "No duration"}
                                </span>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex flex-col gap-1 text-left">
                                    {todayWorkout.exercises.map(
                                        (exercise, index) => {
                                            const formatExercise = (
                                                ex: any
                                            ) => {
                                                let details = "";
                                                if (ex.sets_reps)
                                                    details = ` (${ex.sets_reps})`;
                                                else if (ex.duration)
                                                    details = ` (${ex.duration})`;
                                                else if (ex.reps)
                                                    details = ` (${ex.reps})`;
                                                else if (ex.details)
                                                    details = ` - ${ex.details}`;

                                                return `${
                                                    ex.name ||
                                                    ex.title ||
                                                    "Exercise"
                                                }${details}`;
                                            };

                                            // Handle nested exercise structures
                                            if (exercise.exercises) {
                                                return (
                                                    <div
                                                        key={index}
                                                        className="font-louis text-xs text-gray-700"
                                                    >
                                                        <div className="font-semibold">
                                                            • {exercise.name}
                                                        </div>
                                                        {exercise.exercises.map(
                                                            (
                                                                subEx: any,
                                                                subIndex: number
                                                            ) => (
                                                                <div
                                                                    key={
                                                                        subIndex
                                                                    }
                                                                    className="ml-3 text-gray-600"
                                                                >
                                                                    -{" "}
                                                                    {formatExercise(
                                                                        subEx
                                                                    )}
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                );
                                            }

                                            // Handle supersets
                                            if (exercise.supersets) {
                                                return (
                                                    <div
                                                        key={index}
                                                        className="font-louis text-xs text-gray-700"
                                                    >
                                                        <div className="font-semibold">
                                                            • {exercise.name}
                                                        </div>
                                                        {exercise.supersets.map(
                                                            (
                                                                superset: any,
                                                                superIndex: number
                                                            ) => (
                                                                <div
                                                                    key={
                                                                        superIndex
                                                                    }
                                                                    className="ml-3 text-gray-600"
                                                                >
                                                                    -{" "}
                                                                    {superset.pair.join(
                                                                        " + "
                                                                    )}
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                );
                                            }

                                            // Handle options (like HIIT options)
                                            if (exercise.options) {
                                                return (
                                                    <span
                                                        key={index}
                                                        className="font-louis text-xs text-gray-700"
                                                    >
                                                        •{" "}
                                                        {formatExercise(
                                                            exercise
                                                        )}{" "}
                                                        (
                                                        {exercise.options.join(
                                                            "/"
                                                        )}
                                                        )
                                                    </span>
                                                );
                                            }

                                            // Standard exercise
                                            return (
                                                <span
                                                    key={index}
                                                    className="font-louis text-xs text-gray-700"
                                                >
                                                    • {formatExercise(exercise)}
                                                </span>
                                            );
                                        }
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <span className="font-tango text-lg">
                                {workoutData
                                    ? "No workout scheduled"
                                    : "Loading workout..."}
                            </span>
                        </div>
                    )}
                </div>
                <div className="border-default rounded p-10 text-black text-center">
                    <CircularProgressWithLabel
                        enableTrackSlot
                        variant="determinate"
                        value={70}
                        size={160}
                        thickness={4}
                        color="inherit"
                        label={
                            <div className="text-black flex flex-col gap-1">
                                <span className="font-tango text-[60pt] mb-[-30px]">
                                    15
                                </span>
                                <span className="font-louis text-lg">day</span>
                            </div>
                        }
                        // style={{
                        //     transform: "rotate(180deg)",
                        // }}
                    />
                </div>
                {/* </Masonry> */}
            </div>
        </div>
    );
}
