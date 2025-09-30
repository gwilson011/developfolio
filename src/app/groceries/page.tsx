"use client";
import { useState, useEffect } from "react";
import MealCard from "../components/MealCard";
import PlanCard from "../components/PlanCard";
import RecipePreview from "../components/RecipePreview";
import Image from "next/image";
import {
    InstagramData,
    ParsedRecipeData,
    RecipeForNotion,
} from "@/app/types/recipe";

const DAYS = ["M", "T", "W", "TH", "F", "S", "S"];

function getDayLabels(startDate: Date): string[] {
    const dayLabels = [];
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dayName = currentDate.toLocaleDateString("en-US", {
            weekday: "short",
        });
        // Convert to match existing format (TH instead of Thu, etc)
        const shortDay = dayName.toUpperCase().slice(0, 2);
        const formattedDay =
            shortDay === "TH"
                ? "TH"
                : shortDay === "SU"
                ? "S"
                : shortDay === "SA"
                ? "S"
                : shortDay;
        dayLabels.push(formattedDay);
    }
    return dayLabels;
}

export default function Home() {
    const [loading, setLoading] = useState(false);
    const [plan, setPlan] = useState<any>(null);
    const [prefs, setPrefs] = useState({ vegetarian: false, dislikes: "" });
    const [weekStart, setWeekStart] = useState<string>("");
    const [dailyCalories, setDailyCalories] = useState(2000);
    const [newPlan, setNewPlan] = useState<boolean>(false);
    const [todaySelected, setTodaySelected] = useState<boolean>(false);
    const [eatOut, setEatOut] = useState<number>(0);
    const [outOfTown, setOutOfTown] = useState<number>(0);
    const [daysOutOfTown, setDaysOutOfTown] = useState<boolean[]>([
        false,
        false,
        false,
        false,
        false,
        false,
        false,
    ]);
    const [mealsOut, setMealsOut] = useState<
        { breakfast: boolean; lunch: boolean; dinner: boolean }[]
    >(
        Array(7)
            .fill(null)
            .map(() => ({ breakfast: false, lunch: false, dinner: false }))
    );
    const [instructions, setInstructions] = useState<string>("");
    const [addInstructions, setAddInstructions] = useState<boolean>(false);
    const [selectKnownMeals, setSelectKnownMeals] = useState<boolean>(false);
    const [knownMeals, setKnownMeals] = useState<any[]>([]);
    const [loadingKnownMeals, setLoadingKnownMeals] = useState<boolean>(false);
    const [previousPlans, setPreviousPlans] = useState<any[]>([]);
    const [loadingPreviousPlans, setLoadingPreviousPlans] =
        useState<boolean>(false);
    const [loadingPlanWeek, setLoadingPlanWeek] = useState<string | null>(null);
    const [selectedKnownMeals, setSelectedKnownMeals] = useState<Set<string>>(
        new Set()
    );
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [maxCalories, setMaxCalories] = useState<number>(9999);
    const [selectedMealType, setSelectedMealType] = useState<string>("All");
    const [selectedTag, setSelectedTag] = useState<string>("All");
    const [showInstagramImport, setShowInstagramImport] =
        useState<boolean>(false);
    const [instagramUrl, setInstagramUrl] = useState<string>("");
    const [importingRecipe, setImportingRecipe] = useState<boolean>(false);
    const [showScreenshotImport, setShowScreenshotImport] =
        useState<boolean>(false);
    const [uploadedImage, setUploadedImage] = useState<File | null>(null);
    const [processingScreenshot, setProcessingScreenshot] =
        useState<boolean>(false);
    const [parsedRecipe, setParsedRecipe] = useState<ParsedRecipeData | null>(
        null
    );
    const [savingRecipe, setSavingRecipe] = useState<boolean>(false);

    useEffect(() => {
        fetch(`/api/notion/latest?t=${Date.now()}`)
            .then((res) => res.json())
            .then((data) => {
                console.log("Fetched latest plan from Notion:", data);
                if (data.ok && data.plan) {
                    console.log("Loaded latest plan from Notion:", data.plan);
                    setPlan(data.plan);

                    // Sync form inputs with loaded plan
                    setDailyCalories(data.plan.target_daily_calories || 2000);
                    setWeekStart(data.plan.week || "");
                }
            })
            .catch(() => {});
    }, []);

    async function fetchKnownMeals() {
        setLoadingKnownMeals(true);
        try {
            const res = await fetch(`/api/meal/get?t=${Date.now()}`);
            const data = await res.json();
            if (data.ok) {
                // Filter unique meals by name
                const uniqueMeals = data.meals.filter(
                    (meal: any, index: number, array: any[]) =>
                        array.findIndex((m: any) => m.name === meal.name) ===
                        index
                );
                setKnownMeals(uniqueMeals);
            }
        } catch (error) {
            // Silent failure
        }
        setLoadingKnownMeals(false);
    }

    useEffect(() => {
        if (selectKnownMeals && knownMeals.length === 0) {
            fetchKnownMeals();
        }
    }, [selectKnownMeals]);

    async function fetchPreviousPlans() {
        setLoadingPreviousPlans(true);
        try {
            const res = await fetch(`/api/plan/get?t=${Date.now()}`);
            const data = await res.json();
            if (data.ok) {
                setPreviousPlans(data.plans);
            }
        } catch (error) {
            // Silent failure
        }
        setLoadingPreviousPlans(false);
    }

    useEffect(() => {
        fetchPreviousPlans();
    }, []);

    // Auto-enable new plan mode when no previous plans exist
    useEffect(() => {
        if (!loadingPreviousPlans && previousPlans.length === 0 && !plan) {
            setNewPlan(true);
        }
    }, [loadingPreviousPlans, previousPlans.length, plan]);

    function handleMealSelection(mealName: string) {
        setSelectedKnownMeals((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(mealName)) {
                newSet.delete(mealName);
            } else {
                newSet.add(mealName);
            }
            return newSet;
        });
    }

    // Get unique tags from all meals for dropdown
    const availableTags = Array.from(
        new Set(knownMeals.flatMap((meal: any) => meal.tags || []))
    );

    // Filter meals based on search and filter criteria
    const filteredMeals = knownMeals.filter((meal: any) => {
        // Search filter (name and ingredients)
        const searchMatch =
            !searchTerm ||
            meal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            meal.ingredients.some((ingredient: string) =>
                ingredient.toLowerCase().includes(searchTerm.toLowerCase())
            );

        // Calorie filter
        const calorieMatch = meal.calories <= maxCalories;

        // Meal type filter
        const mealTypeMatch =
            selectedMealType === "All" ||
            (meal.mealType && meal.mealType.includes(selectedMealType));

        // Tag filter
        const tagMatch =
            selectedTag === "All" ||
            (meal.tags && meal.tags.includes(selectedTag));

        return searchMatch && calorieMatch && mealTypeMatch && tagMatch;
    });

    async function handleGenerate() {
        setLoading(true);

        // Calculate the actual start date
        const startDate = todaySelected
            ? new Date()
            : new Date(weekStart || new Date());

        const weekStartISO = startDate.toISOString().slice(0, 10);

        const res = await fetch("/api/plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                preferences: {
                    dislikes: prefs.dislikes
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                },
                weekStartISO: weekStartISO,
                dailyCalories: dailyCalories,
                daysOutOfTown: daysOutOfTown,
                mealsOut: mealsOut,
                instructions: instructions.trim() || undefined,
                selectedKnownMeals: Array.from(selectedKnownMeals),
            }),
        });
        const data = await res.json();

        // Generate array of actual day names starting from the selected date
        if (data.plan && data.plan.days) {
            const dayNames = [];
            for (let i = 0; i < 7; i++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + i);
                dayNames.push(
                    currentDate.toLocaleDateString("en-US", { weekday: "long" })
                );
            }

            // Map the generic API response days to actual day names
            data.plan.days = data.plan.days.map((day: any, index: number) => ({
                ...day,
                day: dayNames[index],
            }));
        }

        setPlan(data.plan);
        setLoading(false);
        setNewPlan(false);
    }

    function updatePlanDates(plan: any, newStartDate: Date) {
        const weekStartISO = newStartDate.toISOString().slice(0, 10);

        // Generate day names for new start date (reuse existing logic)
        const dayNames = [];
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(newStartDate);
            currentDate.setDate(newStartDate.getDate() + i);
            dayNames.push(
                currentDate.toLocaleDateString("en-US", { weekday: "long" })
            );
        }

        return {
            ...plan,
            week: weekStartISO,
            days: plan.days.map((day: any, index: number) => ({
                ...day,
                day: dayNames[index],
            })),
        };
    }

    async function loadPreviousPlan(
        week: string,
        updateToCurrentWeek: boolean = false
    ) {
        setLoadingPlanWeek(week);
        try {
            const res = await fetch(`/api/plan/get?week=${week}`);
            const data = await res.json();

            if (data.ok && data.plan) {
                let finalPlan = data.plan;

                // If updating to current week, recalculate dates
                if (updateToCurrentWeek) {
                    const currentStartDate = todaySelected
                        ? new Date()
                        : new Date(weekStart || new Date());
                    finalPlan = updatePlanDates(data.plan, currentStartDate);
                }

                // Update plan state with loaded (and possibly updated) plan
                setPlan(finalPlan);

                // Update daily calories from loaded plan
                setDailyCalories(finalPlan.target_daily_calories || 2000);

                // Clear the new plan state to show the loaded plan
                setNewPlan(false);

                // Optionally clear travel/meals out settings since they're week-specific
                setDaysOutOfTown([
                    false,
                    false,
                    false,
                    false,
                    false,
                    false,
                    false,
                ]);
                setMealsOut(
                    Array(7)
                        .fill(null)
                        .map(() => ({
                            breakfast: false,
                            lunch: false,
                            dinner: false,
                        }))
                );

                console.log("Loaded plan:", finalPlan);
            } else {
                alert(
                    "Failed to load plan: " + (data.error || "Unknown error")
                );
            }
        } catch (error) {
            console.error("Error loading plan:", error);
            alert("Error loading plan. Please try again.");
        }
        setLoadingPlanWeek(null);
    }

    async function handleAppend() {
        if (!plan) return;
        await fetch("/api/notion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                plan: plan,
                weekStart:
                    plan.week ||
                    weekStart ||
                    new Date().toISOString().slice(0, 10),
                //sectionTitle: "haul @Last Thursday", // optional; omit to auto-date it
                //labelCategory: true, // optional; appends "item — Category"
            }),
        });
        alert("Added to Notion ✅");
    }

    async function handleInstagramImport() {
        if (!instagramUrl.trim()) return;

        setImportingRecipe(true);
        try {
            // Step 1: Extract Instagram data
            const extractRes = await fetch("/api/instagram/extract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: instagramUrl }),
            });
            const extractData = await extractRes.json();

            if (!extractData.ok) {
                alert("Failed to extract Instagram data: " + extractData.error);
                return;
            }

            // Step 2: Parse recipe with AI
            const parseRes = await fetch("/api/recipe/parse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ instagramData: extractData.data }),
            });
            const parseData = await parseRes.json();

            if (!parseData.ok) {
                alert("Failed to parse recipe: " + parseData.error);
                return;
            }

            // Step 3: Show preview for editing
            setParsedRecipe(parseData.recipe);
        } catch (error) {
            console.error("Import error:", error);
            alert("Failed to import recipe. Please try again.");
        } finally {
            setImportingRecipe(false);
        }
    }

    async function handleRecipeSave(recipe: RecipeForNotion) {
        setSavingRecipe(true);
        try {
            const saveRes = await fetch("/api/recipe/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(recipe),
            });
            const saveData = await saveRes.json();

            if (saveData.ok) {
                alert("Recipe saved to Notion! ✅");
                // Reset state
                setParsedRecipe(null);
                setInstagramUrl("");
                setShowInstagramImport(false);
                // Refresh known meals if they're being shown
                if (selectKnownMeals) {
                    fetchKnownMeals();
                }
            } else {
                alert("Failed to save recipe: " + saveData.error);
            }
        } catch (error) {
            console.error("Save error:", error);
            alert("Failed to save recipe. Please try again.");
        } finally {
            setSavingRecipe(false);
        }
    }

    function handleRecipeCancel() {
        setParsedRecipe(null);
        setInstagramUrl("");
        setUploadedImage(null);
    }

    async function handleScreenshotImport() {
        if (!uploadedImage) return;

        setProcessingScreenshot(true);
        try {
            // Step 1: Upload the image and get data URL
            const formData = new FormData();
            formData.append("image", uploadedImage);

            const uploadRes = await fetch("/api/screenshot/upload", {
                method: "POST",
                body: formData,
            });
            const uploadData = await uploadRes.json();

            if (!uploadData.ok) {
                alert("Failed to upload image: " + uploadData.error);
                return;
            }

            // Step 2: Extract text from image using OCR
            const ocrRes = await fetch("/api/ocr/extract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageUrls: [uploadData.imageData] }),
            });
            const ocrData = await ocrRes.json();

            if (!ocrData.ok) {
                alert("Failed to extract text from image: " + ocrData.error);
                return;
            }

            // Step 3: Create mock Instagram data from OCR results
            const mockInstagramData = {
                url: "screenshot://uploaded",
                caption: ocrData.combinedText || "No text found in image",
                images: [uploadData.imageData],
                author: "Screenshot User",
                timestamp: new Date().toISOString(),
                comments: [], // No comments for screenshots
            };

            // Step 4: Parse recipe with AI
            const parseRes = await fetch("/api/recipe/parse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ instagramData: mockInstagramData }),
            });
            const parseData = await parseRes.json();

            if (!parseData.ok) {
                alert("Failed to parse recipe: " + parseData.error);
                return;
            }

            // Step 5: Show preview for editing
            setParsedRecipe(parseData.recipe);
        } catch (error) {
            console.error("Screenshot import error:", error);
            alert("Failed to process screenshot. Please try again.");
        } finally {
            setProcessingScreenshot(false);
        }
    }

    return (
        <div className="flex flex-col min-h-screen w-full p-12 gap-6">
            {newPlan && (
                <div className="flex flex-row justify-between items-center">
                    <main className="flex flex-col p-6 max-w-3xl mx-auto space-y-4 w-full">
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-row gap-2 w-full">
                                <button
                                    onClick={() => {
                                        setTodaySelected(!todaySelected);
                                    }}
                                    disabled={loading}
                                    className={`flex w-full p-3 border-default items-center justify-center font-pixel text-xs hover:text-white hover:bg-black
                                ${
                                    todaySelected
                                        ? "bg-black text-white"
                                        : "bg-white text-black"
                                }`}
                                >
                                    TODAY
                                </button>
                                <button
                                    onClick={() => {
                                        setTodaySelected(!todaySelected);
                                    }}
                                    disabled={loading}
                                    className={`flex p-3 border-default justify-center font-pixel text-xs hover:text-white hover:bg-black
                                ${
                                    todaySelected
                                        ? "bg-white text-black"
                                        : "bg-black text-white"
                                }`}
                                >
                                    {todaySelected ? (
                                        <Image
                                            alt="future"
                                            src={"/clock.jpg"}
                                            width={20}
                                            height={20}
                                        />
                                    ) : (
                                        <Image
                                            alt="future"
                                            src={"/clock_inverted.jpg"}
                                            width={20}
                                            height={20}
                                        />
                                    )}
                                </button>
                            </div>
                            {!todaySelected && (
                                <input
                                    className="border-default p-2 rounded text-black font-louis"
                                    type="date"
                                    value={weekStart}
                                    onChange={(e) =>
                                        setWeekStart(e.target.value)
                                    }
                                />
                            )}
                            <div className="flex flex-row w-full gap-2">
                                <input
                                    className="border-default font-louis text-black p-2 rounded w-full"
                                    type="number"
                                    placeholder="Daily Calorie Goal"
                                    value={dailyCalories}
                                    onChange={(e) =>
                                        setDailyCalories(Number(e.target.value))
                                    }
                                    min="1000"
                                    max="5000"
                                />
                                <span className="text-black font-louis content-center">
                                    calories
                                </span>
                            </div>
                            <div className="flex flex-row w-full gap-3">
                                <span className="text-black font-tango text-lg content-center text-nowrap">
                                    DAYS OOT
                                </span>
                                <input
                                    className="border-default font-louis text-black p-2 rounded w-full"
                                    type="number"
                                    placeholder="Days Out Of Town"
                                    value={outOfTown}
                                    onChange={(e) =>
                                        setOutOfTown(Number(e.target.value))
                                    }
                                    min="0"
                                    max="6"
                                />
                            </div>
                            {outOfTown > 0 && (
                                <div className="text-black font-pixel flex text-xs flex-row gap-2 justify-left w-full items-center">
                                    {(() => {
                                        const startDate = todaySelected
                                            ? new Date()
                                            : new Date(weekStart || new Date());
                                        const dayLabels =
                                            getDayLabels(startDate);
                                        return daysOutOfTown.map(
                                            (day, index) => (
                                                <button
                                                    key={index}
                                                    className={`flex flex-row gap-2 items-center p-2 border-default ${
                                                        daysOutOfTown[index]
                                                            ? "bg-black text-white"
                                                            : "bg-white text-black"
                                                    }`}
                                                    onClick={() => {
                                                        const updatedDays = [
                                                            ...daysOutOfTown,
                                                        ];
                                                        if (outOfTown > 0) {
                                                            updatedDays[index] =
                                                                !updatedDays[
                                                                    index
                                                                ];
                                                            const selectedCount =
                                                                updatedDays.filter(
                                                                    (d) => d
                                                                ).length;
                                                            if (
                                                                selectedCount <=
                                                                outOfTown
                                                            ) {
                                                                setDaysOutOfTown(
                                                                    updatedDays
                                                                );
                                                            }
                                                        }
                                                        console.log(
                                                            updatedDays
                                                        );
                                                    }}
                                                >
                                                    {dayLabels[index]}{" "}
                                                </button>
                                            )
                                        );
                                    })()}
                                    {daysOutOfTown.filter((d) => d).length <
                                        outOfTown && (
                                        <span className="font-louis text-sm text-red-500">
                                            Select {outOfTown} days
                                        </span>
                                    )}
                                </div>
                            )}
                            <div className="flex flex-row w-full gap-3 justify-right">
                                <span className="text-black font-tango text-lg content-center text-nowrap">
                                    MEALS OUT
                                </span>
                                <button
                                    onClick={() => {
                                        setEatOut(eatOut > 0 ? 0 : 1);
                                    }}
                                    disabled={loading}
                                    className={`flex w-full p-3 border-default items-center justify-center font-pixel text-xs hover:text-white hover:bg-black
                                ${
                                    eatOut > 0
                                        ? "bg-black text-white"
                                        : "bg-white text-black"
                                }`}
                                >
                                    {eatOut > 0 ? "ENABLED" : "DISABLED"}
                                </button>
                            </div>
                            {eatOut > 0 && (
                                <div className="text-black font-pixel text-xs flex flex-col gap-2 justify-left w-full">
                                    {(() => {
                                        const startDate = todaySelected
                                            ? new Date()
                                            : new Date(weekStart || new Date());
                                        const dayLabels =
                                            getDayLabels(startDate);
                                        const fullDayNames = [
                                            "Monday",
                                            "Tuesday",
                                            "Wednesday",
                                            "Thursday",
                                            "Friday",
                                            "Saturday",
                                            "Sunday",
                                        ];

                                        return mealsOut.map(
                                            (meal, dayIndex) => {
                                                const isOutOfTown =
                                                    daysOutOfTown[dayIndex];

                                                return (
                                                    <div
                                                        key={dayIndex}
                                                        className="flex flex-row gap-2 items-center"
                                                    >
                                                        <span className="font-tango text-sm content-center text-nowrap min-w-[60px]">
                                                            {fullDayNames[
                                                                dayIndex
                                                            ]
                                                                .slice(0, 3)
                                                                .toUpperCase()}
                                                        </span>
                                                        <button
                                                            disabled={
                                                                isOutOfTown
                                                            }
                                                            className={`flex flex-row gap-2 items-center p-2 border-default ${
                                                                isOutOfTown
                                                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                                                    : meal.breakfast
                                                                    ? "bg-black text-white"
                                                                    : "bg-white text-black"
                                                            }`}
                                                            onClick={() => {
                                                                if (
                                                                    !isOutOfTown
                                                                ) {
                                                                    const updatedMeals =
                                                                        [
                                                                            ...mealsOut,
                                                                        ];
                                                                    updatedMeals[
                                                                        dayIndex
                                                                    ] = {
                                                                        ...updatedMeals[
                                                                            dayIndex
                                                                        ],
                                                                        breakfast:
                                                                            !updatedMeals[
                                                                                dayIndex
                                                                            ]
                                                                                .breakfast,
                                                                    };
                                                                    setMealsOut(
                                                                        updatedMeals
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            BREAKFAST
                                                        </button>
                                                        <button
                                                            disabled={
                                                                isOutOfTown
                                                            }
                                                            className={`flex flex-row gap-2 items-center p-2 border-default ${
                                                                isOutOfTown
                                                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                                                    : meal.lunch
                                                                    ? "bg-black text-white"
                                                                    : "bg-white text-black"
                                                            }`}
                                                            onClick={() => {
                                                                if (
                                                                    !isOutOfTown
                                                                ) {
                                                                    const updatedMeals =
                                                                        [
                                                                            ...mealsOut,
                                                                        ];
                                                                    updatedMeals[
                                                                        dayIndex
                                                                    ] = {
                                                                        ...updatedMeals[
                                                                            dayIndex
                                                                        ],
                                                                        lunch: !updatedMeals[
                                                                            dayIndex
                                                                        ].lunch,
                                                                    };
                                                                    setMealsOut(
                                                                        updatedMeals
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            LUNCH
                                                        </button>
                                                        <button
                                                            disabled={
                                                                isOutOfTown
                                                            }
                                                            className={`flex flex-row gap-2 items-center p-2 border-default ${
                                                                isOutOfTown
                                                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                                                    : meal.dinner
                                                                    ? "bg-black text-white"
                                                                    : "bg-white text-black"
                                                            }`}
                                                            onClick={() => {
                                                                if (
                                                                    !isOutOfTown
                                                                ) {
                                                                    const updatedMeals =
                                                                        [
                                                                            ...mealsOut,
                                                                        ];
                                                                    updatedMeals[
                                                                        dayIndex
                                                                    ] = {
                                                                        ...updatedMeals[
                                                                            dayIndex
                                                                        ],
                                                                        dinner: !updatedMeals[
                                                                            dayIndex
                                                                        ]
                                                                            .dinner,
                                                                    };
                                                                    setMealsOut(
                                                                        updatedMeals
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            DINNER
                                                        </button>
                                                        {isOutOfTown && (
                                                            <span className="font-louis text-xs text-gray-500">
                                                                (Out of town)
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            }
                                        );
                                    })()}
                                </div>
                            )}
                            <div className="flex flex-row gap-2 w-full">
                                <button
                                    onClick={() => {
                                        setAddInstructions(!addInstructions);
                                    }}
                                    disabled={loading}
                                    className={`flex w-full p-3 border-default justify-center font-pixel text-xs hover:text-white hover:bg-black
                                ${
                                    addInstructions
                                        ? "bg-black text-white"
                                        : "bg-white text-black"
                                }`}
                                >
                                    INSTRUCT
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectKnownMeals(!selectKnownMeals);
                                    }}
                                    disabled={loading}
                                    className={`flex w-full p-3 border-default justify-center font-pixel text-xs hover:text-white hover:bg-black
                                ${
                                    selectKnownMeals
                                        ? "bg-black text-white"
                                        : "bg-white text-black"
                                }`}
                                >
                                    ADD MEALS
                                </button>
                            </div>
                            {addInstructions && (
                                <input
                                    className="border-default font-louis p-2 rounded text-black"
                                    placeholder="Additional Instructions"
                                    value={instructions}
                                    onChange={(e) =>
                                        setInstructions(e.target.value)
                                    }
                                />
                            )}
                            <div className="flex flex-row gap-2 justify-end w-full">
                                <button
                                    onClick={() => setNewPlan(false)}
                                    disabled={loading}
                                    className="flex p-3 bg-white border-default justify-center text-black font-pixel text-xs hover:text-white hover:bg-black"
                                >
                                    BACK
                                </button>
                                <button
                                    onClick={handleGenerate}
                                    disabled={loading}
                                    className="flex p-3 w-full hover:bg-white border-default justify-center hover:text-black font-pixel text-xs text-white bg-black"
                                >
                                    {loading
                                        ? "GENERATING..."
                                        : "GENERATE PLAN"}
                                </button>
                            </div>
                        </div>
                    </main>
                    {selectKnownMeals && (
                        <div className="flex flex-col p-4 w-full text-black gap-4">
                            <span className="font-tango text-lg">
                                KNOWN MEALS
                            </span>

                            {/* Search and Filter Controls */}
                            <div className="flex flex-col gap-2">
                                <input
                                    className="border-default p-2 rounded text-black font-louis w-full"
                                    type="text"
                                    placeholder="Search meals..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                />
                                <div className="flex flex-row gap-2 w-full">
                                    <div className="flex flex-row gap-1 items-center">
                                        <input
                                            className="border-default p-2 rounded text-black font-louis"
                                            type="number"
                                            placeholder="Max calories"
                                            value={
                                                maxCalories === 9999
                                                    ? ""
                                                    : maxCalories
                                            }
                                            onChange={(e) =>
                                                setMaxCalories(
                                                    e.target.value
                                                        ? Number(e.target.value)
                                                        : 9999
                                                )
                                            }
                                            min="0"
                                        />
                                        <span className="font-tango text-sm">
                                            cal
                                        </span>
                                    </div>
                                    <select
                                        className="border-default p-2 rounded text-black font-louis"
                                        value={selectedMealType}
                                        onChange={(e) =>
                                            setSelectedMealType(e.target.value)
                                        }
                                    >
                                        <option value="All">All Types</option>
                                        <option value="breakfast">
                                            Breakfast
                                        </option>
                                        <option value="lunch">Lunch</option>
                                        <option value="dinner">Dinner</option>
                                        <option value="dessert">Dessert</option>
                                        <option value="snack">Snack</option>
                                    </select>
                                    <select
                                        className="border-default p-2 rounded text-black font-louis"
                                        value={selectedTag}
                                        onChange={(e) =>
                                            setSelectedTag(e.target.value)
                                        }
                                    >
                                        <option value="All">All Tags</option>
                                        {availableTags.map((tag: string) => (
                                            <option key={tag} value={tag}>
                                                {tag}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {loadingKnownMeals ? (
                                <div className="font-louis text-sm">
                                    Loading...
                                </div>
                            ) : filteredMeals.length === 0 ? (
                                <div className="font-louis text-sm">
                                    {knownMeals.length === 0
                                        ? "No meals found"
                                        : "No meals match your filters"}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start overflow-auto max-h-[24rem] border-default rounded p-4">
                                    {filteredMeals.map(
                                        (meal: any, index: number) => (
                                            <MealCard
                                                key={index}
                                                title={meal.name}
                                                ingredients={meal.ingredients}
                                                instructions={meal.instructions}
                                                calories={meal.calories}
                                                servings={meal.servings}
                                                mealType={meal.mealType}
                                                tags={meal.tags}
                                                isSelected={selectedKnownMeals.has(
                                                    meal.name
                                                )}
                                                onSelect={() =>
                                                    handleMealSelection(
                                                        meal.name
                                                    )
                                                }
                                            />
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            {plan && !newPlan && (
                <div className="space-y-6 flex flex-col ">
                    <div className="flex flex-col md:flex-row w-full justify-between gap-6">
                        <div className="flex flex-col text-center justify-center w-full gap-4">
                            <div className="">
                                <h2 className="font-tango text-lg text-black">
                                    Week of
                                </h2>
                                <h2 className="font-tango text-4xl text-black">
                                    {plan.week}
                                </h2>
                            </div>
                            <p className="font-pixel text-black">
                                {plan.target_daily_calories}{" "}
                                <span className="font-louis">calories/day</span>
                            </p>
                            <div>
                                <button
                                    onClick={() => {
                                        setNewPlan(true);
                                    }}
                                    disabled={loading}
                                    className="p-2 bg-white border-default justify-center text-black font-pixel text-[8pt] hover:text-white hover:bg-black"
                                >
                                    NEW PLAN
                                </button>
                            </div>
                        </div>
                        <div className="justify-center w-full p-6 md:p-10">
                            <h3 className="font-tango text-black text-3xl">
                                GROCERY LIST
                            </h3>
                            <div className="flex gap-3 flex-col md:flex-row">
                                {Object.entries(plan.grocery_list).map(
                                    ([category, items]) => (
                                        <div key={category}>
                                            <h4 className="font-pixel text-xs text-black p-4">
                                                {category.toUpperCase()}
                                            </h4>
                                            <ul className="font-louis text-black list-disc list-inside text-nowrap">
                                                {items.map((item: string) => (
                                                    <li key={item}>{item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Recipe Import Section */}
                    <div className="flex flex-col gap-4 p-6 border-default rounded">
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <h3 className="font-tango text-black text-lg">
                                IMPORT RECIPE
                            </h3>
                            <button
                                onClick={() => {
                                    setShowInstagramImport(
                                        !showInstagramImport
                                    );
                                    setShowScreenshotImport(false);
                                }}
                                className={`w-full md:w-fit flex px-4 py-2 border-default justify-center font-pixel text-xs hover:text-white hover:bg-black
                            ${
                                showInstagramImport
                                    ? "bg-black text-white"
                                    : "bg-white text-black"
                            }`}
                            >
                                INSTAGRAM
                            </button>
                            <button
                                onClick={() => {
                                    setShowScreenshotImport(
                                        !showScreenshotImport
                                    );
                                    setShowInstagramImport(false);
                                }}
                                className={`flex w-full md:w-fit px-4 py-2 border-default justify-center font-pixel text-xs hover:text-white hover:bg-black
                            ${
                                showScreenshotImport
                                    ? "bg-black text-white"
                                    : "bg-white text-black"
                            }`}
                            >
                                SCREENSHOT
                            </button>
                        </div>

                        {showInstagramImport && (
                            <div className="flex flex-col gap-2">
                                <input
                                    className="border-default font-louis p-2 rounded text-black"
                                    type="url"
                                    placeholder="Paste Instagram recipe URL here..."
                                    value={instagramUrl}
                                    onChange={(e) =>
                                        setInstagramUrl(e.target.value)
                                    }
                                />
                                <button
                                    onClick={handleInstagramImport}
                                    disabled={
                                        importingRecipe || !instagramUrl.trim()
                                    }
                                    className="flex p-2 border-default justify-center font-pixel text-xs text-black bg-white hover:text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {importingRecipe
                                        ? "IMPORTING..."
                                        : "IMPORT RECIPE"}
                                </button>
                            </div>
                        )}

                        {showScreenshotImport && (
                            <div className="flex flex-col gap-2">
                                <div
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.classList.add(
                                            "border-blue-400",
                                            "bg-blue-50"
                                        );
                                    }}
                                    onDragLeave={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.classList.remove(
                                            "border-blue-400",
                                            "bg-blue-50"
                                        );
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.classList.remove(
                                            "border-blue-400",
                                            "bg-blue-50"
                                        );
                                        const files = e.dataTransfer.files;
                                        if (
                                            files.length > 0 &&
                                            files[0].type.startsWith("image/")
                                        ) {
                                            setUploadedImage(files[0]);
                                        }
                                    }}
                                >
                                    {uploadedImage ? (
                                        <div className="flex flex-col gap-2">
                                            <img
                                                src={URL.createObjectURL(
                                                    uploadedImage
                                                )}
                                                alt="Uploaded screenshot"
                                                className="max-h-40 mx-auto rounded"
                                            />
                                            <p className="font-louis text-sm text-gray-600">
                                                {uploadedImage.name}
                                            </p>
                                            <button
                                                onClick={() =>
                                                    setUploadedImage(null)
                                                }
                                                className="text-xs font-pixel text-red-500 hover:text-red-700"
                                            >
                                                REMOVE
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            <p className="font-louis text-black">
                                                Drop a screenshot here, or click
                                                to browse
                                            </p>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file =
                                                        e.target.files?.[0];
                                                    if (file)
                                                        setUploadedImage(file);
                                                }}
                                                className="hidden"
                                                id="screenshot-upload"
                                            />
                                            <label
                                                htmlFor="screenshot-upload"
                                                className="cursor-pointer p-2 border-default bg-white text-black hover:bg-black hover:text-white font-pixel text-xs"
                                            >
                                                CHOOSE FILE
                                            </label>
                                        </div>
                                    )}
                                </div>
                                {uploadedImage && (
                                    <button
                                        onClick={handleScreenshotImport}
                                        disabled={processingScreenshot}
                                        className="flex p-2 border-default justify-center font-pixel text-xs text-black bg-white hover:text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processingScreenshot
                                            ? "PROCESSING..."
                                            : "EXTRACT RECIPE"}
                                    </button>
                                )}
                            </div>
                        )}

                        {parsedRecipe && (
                            <RecipePreview
                                recipe={parsedRecipe}
                                originalUrl={instagramUrl}
                                onSave={handleRecipeSave}
                                onCancel={handleRecipeCancel}
                                isSaving={savingRecipe}
                            />
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <h3 className="font-tango text-black text-3xl">
                            SCHEDULE
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 items-start">
                            {plan.days?.map((day: any, index: number) => (
                                <div key={index} className="space-y-3">
                                    <h3 className="font-pixel text-black text-xs text-center text-lg">
                                        {day.day.toUpperCase()}
                                    </h3>
                                    <div className="space-y-2">
                                        {[
                                            "breakfast",
                                            "lunch",
                                            "dinner",
                                            "snack",
                                        ].map((mealType) => {
                                            const mealName =
                                                day.meals[mealType];
                                            const recipe =
                                                plan.recipes?.[mealName];

                                            // Handle "Eating Out" and missing recipes gracefully
                                            const isEatingOut =
                                                mealName === "Eating Out";

                                            return (
                                                <MealCard
                                                    key={mealType}
                                                    title={
                                                        mealName ||
                                                        "No meal planned"
                                                    }
                                                    ingredients={
                                                        recipe?.ingredients ||
                                                        []
                                                    }
                                                    instructions={
                                                        recipe?.instructions ||
                                                        ""
                                                    }
                                                    calories={
                                                        recipe?.calories_per_serving ||
                                                        0
                                                    }
                                                    servings={
                                                        recipe?.servings ||
                                                        (isEatingOut ? 0 : 1)
                                                    }
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={handleAppend}
                            className="p-3 hover:bg-white border-default justify-center hover:text-black font-pixel text-sm text-white bg-black"
                        >
                            ADD TO NOTION
                        </button>
                    </div>
                </div>
            )}
            <div className="flex flex-col gap-4">
                <h3 className="font-tango text-black text-3xl">
                    PREVIOUS PLANS
                </h3>
                {loadingPreviousPlans ? (
                    <div className="font-louis text-sm text-black">
                        Loading...
                    </div>
                ) : previousPlans.length === 0 ? (
                    <div className="font-louis text-sm text-black">
                        No previous plans found
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {previousPlans.map((planItem: any, index: number) => (
                            <PlanCard
                                key={index}
                                name={planItem.name}
                                week={planItem.week}
                                dailyCalories={planItem.dailyCalories}
                                ingredientCount={planItem.ingredientCount}
                                uniqueMealCount={planItem.uniqueMealCount}
                                onLoadPlan={loadPreviousPlan}
                                isLoading={loadingPlanWeek === planItem.week}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
