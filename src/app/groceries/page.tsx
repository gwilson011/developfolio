"use client";
import { useState, useEffect } from "react";
import MealCard from "../components/MealCard";

export default function Home() {
    const [loading, setLoading] = useState(false);
    const [plan, setPlan] = useState<any>(null);
    const [prefs, setPrefs] = useState({ vegetarian: false, dislikes: "" });
    const [weekStart, setWeekStart] = useState<string>("");
    const [dailyCalories, setDailyCalories] = useState(2000);

    useEffect(() => {
        fetch("/api/notion/latest")
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

    async function handleGenerate() {
        setLoading(true);
        const res = await fetch("/api/plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                preferences: {
                    vegetarian: prefs.vegetarian,
                    dislikes: prefs.dislikes
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                },
                weekStartISO:
                    weekStart || new Date().toISOString().slice(0, 10),
                dailyCalories: dailyCalories,
            }),
        });
        const data = await res.json();
        setPlan(data.plan);
        setLoading(false);
    }

    async function handleAppend() {
        if (!plan) return;
        await fetch("/api/notion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                plan: plan,
                weekStart: plan.week || weekStart || new Date().toISOString().slice(0, 10),
                sectionTitle: "haul @Last Thursday", // optional; omit to auto-date it
                labelCategory: true, // optional; appends "item — Category"
            }),
        });
        alert("Added to Notion ✅");
    }

    return (
        <div className="min-h-screen w-full p-12">
            <main className="p-6 max-w-3xl mx-auto space-y-4 bg-red-100">
                <h1 className="text-2xl font-semibold">Meal Plan Generator</h1>
                <div className="grid gap-2">
                    <input
                        className="border p-2 rounded"
                        type="date"
                        value={weekStart}
                        onChange={(e) => setWeekStart(e.target.value)}
                    />
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={prefs.vegetarian}
                            onChange={(e) =>
                                setPrefs((p) => ({
                                    ...p,
                                    vegetarian: e.target.checked,
                                }))
                            }
                        />
                        Vegetarian
                    </label>
                    <input
                        className="border p-2 rounded"
                        placeholder="Dislikes (comma-separated)"
                        value={prefs.dislikes}
                        onChange={(e) =>
                            setPrefs((p) => ({
                                ...p,
                                dislikes: e.target.value,
                            }))
                        }
                    />
                    <input
                        className="border p-2 rounded"
                        type="number"
                        placeholder="Daily Calorie Goal"
                        value={dailyCalories}
                        onChange={(e) =>
                            setDailyCalories(Number(e.target.value))
                        }
                        min="1000"
                        max="5000"
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="bg-black text-white px-4 py-2 rounded"
                    >
                        {loading ? "Generating..." : "Generate Plan"}
                    </button>
                </div>
            </main>
            {plan && (
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-xl font-semibold">
                            Week of {plan.week}
                        </h2>
                        <p className="text-gray-600">
                            Target: {plan.target_daily_calories} calories/day
                        </p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Grocery List</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(plan.grocery_list).map(
                                ([category, items]) => (
                                    <div key={category}>
                                        <h4 className="font-semibold">
                                            {category}
                                        </h4>
                                        <ul className="list-disc list-inside">
                                            {items.map((item: string) => (
                                                <li key={item}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
                        {plan.days?.map((day: any, index: number) => (
                            <div key={index} className="space-y-3">
                                <h3 className="font-semibold text-center text-lg">
                                    {day.day}
                                </h3>
                                <div className="space-y-2">
                                    {[
                                        "breakfast",
                                        "lunch",
                                        "dinner",
                                        "snack",
                                    ].map((mealType) => {
                                        const mealName = day.meals[mealType];
                                        const recipe = plan.recipes?.[mealName];

                                        return (
                                            <MealCard
                                                key={mealType}
                                                title={mealName}
                                                ingredients={
                                                    recipe?.ingredients || []
                                                }
                                                instructions={
                                                    recipe?.instructions || ""
                                                }
                                                calories={
                                                    recipe?.calories_per_serving ||
                                                    0
                                                }
                                                servings={recipe?.servings || 1}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-center">
                        <button
                            onClick={handleAppend}
                            className="bg-emerald-600 text-white px-4 py-2 rounded"
                        >
                            Add to Notion
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
