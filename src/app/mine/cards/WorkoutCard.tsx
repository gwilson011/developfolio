"use client";

import { parseNotionPage } from "@/app/utils/notion";
import { use, useEffect, useState } from "react";
import Image from "next/image";

interface Exercise {
    name?: string;
    title?: string;
    sets_reps?: string;
    duration?: string;
    reps?: string;
    details?: string;
}

interface ExerciseGroup {
    name: string;
    exercises?: Exercise[];
    supersets?: { pair: string[] }[];
    options?: string[];
}

interface WorkoutData {
    workout_plan: {
        [key: string]: {
            title: string;
            duration?: string;
            exercises: (Exercise | ExerciseGroup)[];
            notes?: string;
        };
    };
}

const WorkoutCard = () => {
    const [workoutData, setWorkoutData] = useState<WorkoutData | null>(null);
    const [imageSrc, setImageSrc] = useState<string>("");
    const [showDetails, setShowDetails] = useState<boolean>(false);

    useEffect(() => {
        const fetchWorkoutData = async () => {
            try {
                // Fetch and parse the page
                const response = await fetch("/api/notion/page");
                const data = await response.json();

                if (data.ok && data.blocks) {
                    const parsed = parseNotionPage(data.blocks);
                    setWorkoutData(parsed as WorkoutData);

                    // Access structured data
                    console.log("Notes:", parsed.notes);
                    console.log("Monday workout:", parsed.schedule?.["Monday"]);
                    console.log("Archives:", parsed.archives);
                }
            } catch (error) {
                console.error("Error fetching blocks:", error);
            }
        };

        fetchWorkoutData();
    }, []);

    useEffect(() => {
        if (!workoutData) return;
        const todayWorkout = getCurrentDayWorkout();
        if (todayWorkout?.title.includes("Pull ")) {
            setImageSrc("/mine/pull.png");
        } else if (todayWorkout?.title.includes("Push ")) {
            setImageSrc("/mine/push.png");
        } else if (todayWorkout?.title.includes("Leg ")) {
            setImageSrc("/mine/legs.png");
        } else if (todayWorkout?.title.includes("Cardio")) {
            setImageSrc("/mine/cardio.png");
        } else if (todayWorkout?.title.includes("Recovery")) {
            setImageSrc("/mine/recovery.png");
        }
    }, [workoutData]);

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
        <div className="border-default rounded p-6 text-black md:max-w-[300px]">
            {todayWorkout ? (
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex flex-col gap-6 place-content-between"
                >
                    <span className="text-[12pt] text-left font-pixel">
                        {todayWorkout.title.toUpperCase()}
                    </span>
                    {showDetails ? (
                        <div className="flex flex-row gap-1 justify-between">
                            <div className="flex flex-col gap-2">
                                <div className="flex flex-col gap-1 text-left">
                                    {todayWorkout.exercises.map(
                                        (exercise, index) => {
                                            const formatExercise = (
                                                ex: Exercise
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
                                            if (
                                                "exercises" in exercise &&
                                                exercise.exercises
                                            ) {
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
                                                                subEx: Exercise,
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
                                            if (
                                                "supersets" in exercise &&
                                                exercise.supersets
                                            ) {
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
                                                                superset: {
                                                                    pair: string[];
                                                                },
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
                                            if (
                                                "options" in exercise &&
                                                exercise.options
                                            ) {
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
                        <div className="flex flex-row gap-1 justify-between">
                            <Image
                                className="ml-4"
                                alt="back"
                                src={imageSrc || "/construction.png"}
                                height={150}
                                width={150}
                            />
                            <span className="flex items-end font-louis">
                                {todayWorkout.duration}
                            </span>
                        </div>
                    )}
                </button>
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
    );
};

export default WorkoutCard;
