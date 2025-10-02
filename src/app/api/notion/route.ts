import { NextRequest, NextResponse } from "next/server";
import { notion } from "@/app/utils/notion";
export const dynamic = "force-dynamic";
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

        // 2. Extract unique meals and track their meal types
        const mealTypes = new Map<string, Set<string>>();
        for (const day of plan.days || []) {
            for (const mealType of ["breakfast", "lunch", "dinner", "snack"]) {
                const mealName = day.meals?.[mealType]?.trim();
                if (mealName && mealName !== "Eating Out") {
                    if (!mealTypes.has(mealName)) {
                        mealTypes.set(mealName, new Set());
                    }
                    mealTypes.get(mealName)!.add(mealType);
                }
            }
        }

        // 3. Get all unique meals (excluding "Eating Out")
        const newMeals = Array.from(mealTypes.keys());

        const weekStartDate =
            weekStart || new Date().toISOString().slice(0, 10);

        const mealPromises = newMeals.map((mealName) => {
            const recipe = plan.recipes?.[mealName];
            const ingredients = recipe?.ingredients?.join(", ") || "";
            const instructions = recipe?.instructions || "";
            const mealTypesList = Array.from(mealTypes.get(mealName) || []);

            return notion.pages.create({
                parent: { database_id: mealsDbId },
                properties: {
                    Name: titleProp(mealName),
                    Ingredients: textProp(ingredients),
                    URL: urlProp(null),
                    "Meal Type": tagsProp(mealTypesList),
                    Tags: tagsProp(["generated"]),
                    Notes: textProp(instructions),
                    Approved: checkboxProp(false),
                    Servings: numberProp(recipe?.servings || 1),
                    "Calories per Serving": numberProp(
                        recipe?.calories_per_serving || 0
                    ),
                    "Protein per Serving": numberProp(
                        recipe?.protein_per_serving || 0
                    ),
                    "Carbs per Serving": numberProp(
                        recipe?.carbs_per_serving || 0
                    ),
                    "Fat per Serving": numberProp(
                        recipe?.fat_per_serving || 0
                    ),
                    "Fiber per Serving": numberProp(
                        recipe?.fiber_per_serving || 0
                    ),
                },
            });
        });

        // Create meal plan properties for each day
        const planProperties: Record<string, unknown> = {
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
            properties: planProperties as any,
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
            mealsTotal: mealTypes.size,
            mealsSkipped: mealTypes.size - newMeals.length,
            planAdded: planResult.status === "fulfilled" ? 1 : 0,
            sectionId: parentId,
            sectionTitle: sectionTitle || "(auto today)",
        });
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        console.error("[/api/notion] error:", errorMessage);
        return NextResponse.json(
            { ok: false, error: errorMessage },
            { status: 500 }
        );
    }
}
