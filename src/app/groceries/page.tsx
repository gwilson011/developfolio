"use client";
import { useState } from "react";

export default function Home() {
    const [loading, setLoading] = useState(false);
    const [plan, setPlan] = useState<any>(null);
    const [prefs, setPrefs] = useState({ vegetarian: false, dislikes: "" });
    const [weekStart, setWeekStart] = useState<string>("");
    const [dailyCalories, setDailyCalories] = useState(2000);

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
                dailyCalories,
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
                weekStart: weekStart || new Date().toISOString().slice(0, 10),
                sectionTitle: "haul @Last Thursday", // optional; omit to auto-date it
                labelCategory: true, // optional; appends "item — Category"
            }),
        });
        alert("Added to Notion ✅");
    }

    return (
        <main className="p-6 max-w-3xl mx-auto space-y-4">
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
                        setPrefs((p) => ({ ...p, dislikes: e.target.value }))
                    }
                />
                <input
                    className="border p-2 rounded"
                    type="number"
                    placeholder="Daily Calorie Goal"
                    value={dailyCalories}
                    onChange={(e) => setDailyCalories(Number(e.target.value))}
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

            {plan && (
                <div className="space-y-3">
                    <pre className="bg-gray-100 p-3 text-black rounded text-sm overflow-auto">
                        {JSON.stringify(plan, null, 2)}
                    </pre>
                    <button
                        onClick={handleAppend}
                        className="bg-emerald-600 text-white px-4 py-2 rounded"
                    >
                        Add to Notion
                    </button>
                </div>
            )}
        </main>
    );
}
