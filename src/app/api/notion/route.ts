import { NextRequest, NextResponse } from "next/server";
import { notion } from "@/app/utils/notion";
import {
    createToggleHeadingAtTop,
    appendTodos,
    flattenGrocery,
    titleProp,
    textProp,
    dateProp,
    tagsProp,
    checkboxProp,
    urlProp,
    numberProp,
} from "@/app/utils/notion";

export async function POST(req: NextRequest) {
    try {
        const {
            plan,
            weekStart,
            sectionTitle,
            labelCategory = false,
        } = await req.json();

        if (!plan) {
            return NextResponse.json(
                { ok: false, error: "Missing plan" },
                { status: 400 }
            );
        }

        const mealsDbId = process.env.NOTION_MEALS_DB_ID;
        const plansDbId = process.env.NOTION_PLANS_DB_ID;

        if (!mealsDbId || !plansDbId) {
            return NextResponse.json(
                { ok: false, error: "Missing Notion database IDs" },
                { status: 500 }
            );
        }

        // 1. Add grocery list to Notion page
        const parentId = await createToggleHeadingAtTop(sectionTitle);
        const groceryItems = flattenGrocery(plan.grocery_list, labelCategory);
        if (groceryItems.length > 0) {
            await appendTodos(parentId, groceryItems);
        }

        // 2. Extract unique meals and create database entries
        const uniqueMeals = new Set<string>();
        for (const day of plan.days || []) {
            for (const mealType of ["breakfast", "lunch", "dinner", "snack"]) {
                const mealName = day.meals?.[mealType]?.trim();
                if (mealName) uniqueMeals.add(mealName);
            }
        }

        const weekStartDate =
            weekStart || new Date().toISOString().slice(0, 10);

        const mealPromises = Array.from(uniqueMeals).map((mealName) => {
            const recipe = plan.recipes?.[mealName];
            const ingredients = recipe?.ingredients?.join(", ") || "";
            const instructions = recipe?.instructions || "";

            return notion.pages.create({
                parent: { database_id: mealsDbId },
                properties: {
                    Name: titleProp(mealName),
                    Ingredients: textProp(ingredients),
                    URL: urlProp(null),
                    Tags: tagsProp(["generated"]),
                    Notes: textProp(instructions),
                    Approved: checkboxProp(false),
                    Servings: numberProp(recipe?.servings || 1),
                    "Calories per Serving": numberProp(
                        recipe?.calories_per_serving || 0
                    ),
                },
            });
        });

        // Create meal plan properties for each day
        const planProperties: any = {
            Name: titleProp(`Meal Plan - Week of ${weekStartDate}`),
            "Week of": dateProp(weekStartDate),
            "Daily Calorie Target": numberProp(
                plan.target_daily_calories || 2000
            ),
        };

        // Add JSON for each day's meals
        for (const day of plan.days || []) {
            const dayName = day.day;
            const dayMeals = {
                breakfast: day.meals?.breakfast || "",
                lunch: day.meals?.lunch || "",
                dinner: day.meals?.dinner || "",
                snack: day.meals?.snack || ""
            };
            planProperties[dayName] = textProp(JSON.stringify(dayMeals));
        }

        // Add grocery list as JSON
        if (plan.grocery_list) {
            planProperties["Grocery List"] = textProp(JSON.stringify(plan.grocery_list));
        }

        const planPromise = notion.pages.create({
            parent: { database_id: plansDbId },
            properties: planProperties,
        });

        // Execute all database operations
        const [mealResults, planResult] = await Promise.allSettled([
            Promise.allSettled(mealPromises),
            planPromise,
        ]);

        const successfulMeals =
            mealResults.status === "fulfilled"
                ? mealResults.value.filter((r) => r.status === "fulfilled")
                      .length
                : 0;

        return NextResponse.json({
            ok: true,
            groceryAdded: groceryItems.length,
            mealsAdded: successfulMeals,
            mealsTotal: uniqueMeals.size,
            planAdded: planResult.status === "fulfilled" ? 1 : 0,
            sectionId: parentId,
            sectionTitle: sectionTitle || "(auto today)",
        });
    } catch (e: any) {
        console.error("[/api/notion] error:", e?.message);
        return NextResponse.json(
            { ok: false, error: e?.message ?? "Unknown error" },
            { status: 500 }
        );
    }
}
