import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { NotionPlanPage, NotionPage, MealPlan, PlanSummary, RecipeData } from "@/app/types/recipe";
export const dynamic = "force-dynamic"; // disable caching

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const targetWeek = searchParams.get('week');

        const notion = new Client({ auth: process.env.NOTION_TOKEN });
        const plansDbId = process.env.NOTION_PLANS_DB_ID;

        if (!plansDbId) {
            return NextResponse.json({ ok: false, plans: [] });
        }

        const response = await notion.search({
            filter: { value: "page", property: "object" },
            sort: { direction: "descending", timestamp: "last_edited_time" },
            page_size: 50,
        });

        const planPages = response.results
            .filter((page) =>
                page && typeof page === 'object' && 'parent' in page &&
                (page as NotionPlanPage).parent?.database_id === plansDbId) as NotionPlanPage[];

        // If requesting a specific week, return full plan details
        if (targetWeek) {
            const targetPlan = planPages.find((page: NotionPlanPage) =>
                page.properties["Week of"]?.date?.start === targetWeek
            );

            if (!targetPlan) {
                return NextResponse.json({ ok: false, error: "Plan not found for specified week" });
            }

            // Reconstruct full plan (similar to /api/notion/latest logic)
            const targetCalories = targetPlan.properties["Daily Calorie Target"]?.number || 2000;
            const weekOf = targetPlan.properties["Week of"]?.date?.start;

            // Reconstruct plan from day-based JSON fields
            const days = [];
            const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

            for (const dayName of dayNames) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const dayField = (targetPlan.properties[dayName] as any)?.rich_text?.[0]?.text?.content;
                if (dayField) {
                    try {
                        const meals = JSON.parse(dayField);
                        if (meals.breakfast || meals.lunch || meals.dinner || meals.snack) {
                            days.push({
                                day: dayName,
                                meals: meals,
                                calories_estimate: targetCalories,
                            });
                        }
                    } catch {
                        // Skip invalid JSON
                    }
                }
            }

            // Get grocery list from JSON field
            let groceryList = {};
            const groceryField = targetPlan.properties["Grocery List"]?.rich_text?.[0]?.text?.content;
            if (groceryField) {
                try {
                    groceryList = JSON.parse(groceryField);
                } catch {
                    // Skip invalid JSON
                }
            }

            const planJson: Partial<MealPlan> = {
                week: weekOf || targetWeek,
                target_daily_calories: targetCalories,
                days: days,
                grocery_list: groceryList,
            };

            // Get recipes for this plan
            const mealsDbId = process.env.NOTION_MEALS_DB_ID;
            if (mealsDbId && planJson.days) {
                // Collect unique meal names
                const mealNames = new Set();
                for (const day of planJson.days) {
                    if (day.meals) {
                        Object.values(day.meals).forEach((mealName) => {
                            if (mealName && typeof mealName === "string" && mealName !== "Eating Out") {
                                mealNames.add(mealName.trim());
                            }
                        });
                    }
                }

                // Search for recipe pages
                const recipeSearchResults = await notion.search({
                    filter: { value: "page", property: "object" },
                    page_size: 50,
                });

                const recipes: Record<string, RecipeData> = {};
                for (const result of recipeSearchResults.results) {
                    const page = result as NotionPage;
                    if (page.parent?.database_id === mealsDbId && page.properties?.Name?.title?.[0]?.text?.content) {
                        const recipeName = page.properties.Name.title[0].text.content;
                        if (mealNames.has(recipeName)) {
                            recipes[recipeName] = {
                                ingredients: page.properties.Ingredients?.rich_text?.[0]?.text?.content?.split(", ") || [],
                                instructions: page.properties.Notes?.rich_text?.[0]?.text?.content || "",
                                servings: page.properties.Servings?.number || 1,
                                calories_per_serving: page.properties["Calories per Serving"]?.number || 0,
                                protein_per_serving: page.properties["Protein per Serving"]?.number || 0,
                                carbs_per_serving: page.properties["Carbs per Serving"]?.number || 0,
                                fat_per_serving: page.properties["Fat per Serving"]?.number || 0,
                                fiber_per_serving: page.properties["Fiber per Serving"]?.number || 0,
                            };
                        }
                    }
                }

                planJson.recipes = recipes;
            }

            return NextResponse.json({ ok: true, plan: planJson });
        }

        // Otherwise, return summary list as before
        const summaryPlans: PlanSummary[] = planPages.map((page: NotionPlanPage): PlanSummary => {
            const name = page.properties.Name?.title?.[0]?.text?.content || "Untitled Plan";
            const weekOf = page.properties["Week of"]?.date?.start || "";
            const dailyCalories = page.properties["Daily Calorie Target"]?.number || 0;

                // Count unique ingredients from grocery list
                let ingredientCount = 0;
                const groceryField = page.properties["Grocery List"]?.rich_text?.[0]?.text?.content;
                if (groceryField) {
                    try {
                        const groceryList = JSON.parse(groceryField);
                        const allIngredients = new Set();
                        Object.values(groceryList).forEach((categoryItems: unknown) => {
                            if (Array.isArray(categoryItems)) {
                                categoryItems.forEach(item => allIngredients.add(item));
                            }
                        });
                        ingredientCount = allIngredients.size;
                    } catch {
                        // Skip invalid JSON
                    }
                }

                // Count unique meals from day fields
                let uniqueMealCount = 0;
                const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
                const uniqueMeals = new Set();

                for (const dayName of dayNames) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const dayField = (page.properties[dayName] as any)?.rich_text?.[0]?.text?.content;
                    if (dayField) {
                        try {
                            const dayMeals = JSON.parse(dayField);
                            Object.values(dayMeals).forEach((mealName: unknown) => {
                                if (mealName && typeof mealName === "string" && mealName.trim()) {
                                    uniqueMeals.add(mealName.trim());
                                }
                            });
                        } catch {
                            // Skip invalid JSON
                        }
                    }
                }
                uniqueMealCount = uniqueMeals.size;

            return {
                name,
                week: weekOf,
                dailyCalories,
                ingredientCount,
                uniqueMealCount,
            };
        });

        return NextResponse.json({ ok: true, plans: summaryPlans });
    } catch {
        return NextResponse.json({ ok: false, plans: [] });
    }
}