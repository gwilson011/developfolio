import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

const PlanSchema = z.object({
    week: z.string(),
    days: z
        .array(
            z.object({
                day: z.string(),
                meals: z.object({
                    breakfast: z.string(),
                    lunch: z.string(),
                    dinner: z.string(),
                }),
                calories_estimate: z.number().optional(),
            })
        )
        .length(7),
    grocery_list: z.record(z.string(), z.array(z.string())),
    recipes: z.record(z.object({
        ingredients: z.array(z.string()),
        instructions: z.string(),
        servings: z.number(),
        calories_per_serving: z.number(),
    })),
    target_daily_calories: z.number(),
});

export async function POST(req: NextRequest) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { ok: false, error: "OPENAI_API_KEY missing" },
                { status: 500 }
            );
        }
        const body = await req.json();
        const { preferences, weekStartISO, knownMeals = [], dailyCalories = 2000 } = body ?? {};

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const sys = `You are a meal-planning assistant. Target ${dailyCalories} calories per day.
Output strict JSON with these exact keys:
1. week: string
2. days: array of 7 day objects with {day, meals{breakfast,lunch,dinner}, calories_estimate}
3. grocery_list: object with categories as keys and ingredient arrays as values
4. recipes: object where each meal name is a key with {ingredients: string[], instructions: string, servings: number, calories_per_serving: number}
5. target_daily_calories: number

CALORIE DISTRIBUTION: Breakfast 25%, Lunch 35%, Dinner 40% of daily calories.
INGREDIENT OPTIMIZATION: Maximize ingredient overlap - use same proteins, vegetables, and grains across multiple meals to minimize grocery items.
REQUIRED: Include recipes section with every unique meal. US measurements. JSON only.`;
        const user = {
            known_meals: knownMeals,
            preferences,
            week: weekStartISO,
            output_format: "JSON only",
        };

        const resp = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.2,
            messages: [
                { role: "system", content: sys },
                { role: "user", content: JSON.stringify(user) },
            ],
        });

        const text = resp.choices?.[0]?.message?.content ?? "";
        console.log("[/api/plan] raw model output:", text.slice(0, 500));

        let parsedJson: unknown;
        try {
            parsedJson = JSON.parse(text);
        } catch (e: any) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Model did not return JSON",
                    detail: text.slice(0, 2000),
                },
                { status: 500 }
            );
        }

        const parsed = PlanSchema.safeParse(parsedJson);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Invalid plan JSON shape",
                    zodIssues: parsed.error.issues,
                    preview: JSON.stringify(parsedJson).slice(0, 2000),
                },
                { status: 500 }
            );
        }

        return NextResponse.json({ ok: true, plan: parsed.data });
    } catch (e: any) {
        console.error("[/api/plan] error:", e?.message, e?.stack);
        return NextResponse.json(
            { ok: false, error: e?.message ?? "Unknown error" },
            { status: 500 }
        );
    }
}
