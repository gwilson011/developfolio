"use client";
import { useState, useEffect, useRef } from "react";
import { MealPlan, DayMeal } from "@/app/types/recipe";
import Image from "next/image";
import Link from "next/link";

const mealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealType = (typeof mealTypes)[number];

const DailyMealCard = () => {
    const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentMeal, setCurrentMeal] = useState<MealType>("breakfast");

    const breakfastRef = useRef<HTMLDivElement>(null);
    const lunchRef = useRef<HTMLDivElement>(null);
    const dinnerRef = useRef<HTMLDivElement>(null);
    const snackRef = useRef<HTMLDivElement>(null);

    const imageSrc: Record<MealType, string> = {
        breakfast: "/mine/breakfast.png",
        lunch: "/mine/lunch.png",
        dinner: "/mine/dinner.png",
        snack: "/mine/snack.png",
    };

    const refs: Record<MealType, React.RefObject<HTMLDivElement>> = {
        breakfast: breakfastRef,
        lunch: lunchRef,
        dinner: dinnerRef,
        snack: snackRef,
    };

    const getCurrentMealType = (): MealType => {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 11) return "breakfast";
        if (hour >= 11 && hour < 15) return "lunch";
        if (hour >= 15 && hour < 20) return "dinner";
        return "snack";
    };

    const getTodaysMeals = (): DayMeal | null => {
        if (!mealPlan) return null;

        const currentDay = new Date().toLocaleDateString("en-US", {
            weekday: "long",
        });

        const todayPlan = mealPlan.days.find((day) => day.day === currentDay);
        return todayPlan?.meals || null;
    };

    useEffect(() => {
        const fetchMealPlan = async () => {
            try {
                setLoading(true);
                const response = await fetch("/api/notion/latest");
                const result = await response.json();

                if (result.ok && result.plan) {
                    setMealPlan(result.plan);
                    setCurrentMeal(getCurrentMealType());
                } else {
                    setError(result.error || "Failed to fetch meal plan");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        };

        fetchMealPlan();
    }, []);

    useEffect(() => {
        if (!loading && mealPlan) {
            const targetRef = refs[currentMeal];
            targetRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "center",
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, mealPlan, currentMeal]);

    return (
        <div className="border-default rounded text-black p-2">
            {loading ? (
                <div className="flex items-center justify-center min-h-[150px]">
                    <span className="font-louis text-lg">Loading...</span>
                </div>
            ) : error ? (
                <div className="flex items-center justify-center min-h-[150px]">
                    <span className="font-louis text-sm text-red-600">
                        Error: {error}
                    </span>
                </div>
            ) : getTodaysMeals() ? (
                <Link href="/groceries" className="cursor-pointer">
                    <div className="flex flex-row gap-4 overflow-x-scroll overflow-y-hidden snap-x snap-mandatory max-w-[250px]">
                        {mealTypes.map((mealType) => {
                            const todaysMeals = getTodaysMeals();
                            const mealName =
                                todaysMeals?.[mealType as keyof DayMeal];

                            return (
                                <div
                                    key={mealType}
                                    ref={refs[mealType]}
                                    className="flex-shrink-0 w-[250px] p-4 snap-center"
                                >
                                    <div className="flex h-full flex-col justify-between gap-2">
                                        <span className="font-pixel text-[10pt] uppercase">
                                            {mealType}
                                        </span>

                                        <Image
                                            alt={mealType}
                                            src={imageSrc[mealType]}
                                            height={150}
                                            width={150}
                                            className="mx-auto"
                                        />

                                        <span className="font-louis text-base">
                                            {mealName ?? "No meal planned"}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Link>
            ) : (
                <div className="flex items-center justify-center min-h-[150px]">
                    <span className="font-louis text-lg">
                        No meal plan for today
                    </span>
                </div>
            )}
        </div>
    );
};

export default DailyMealCard;
