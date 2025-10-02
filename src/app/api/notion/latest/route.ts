import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { NotionPlanPage, NotionPage, RecipeData, MealPlan } from "@/app/types/recipe";
export const dynamic = "force-dynamic"; // disable caching

export async function GET() {
    try {
        const notion = new Client({ auth: process.env.NOTION_TOKEN });
        const plansDbId = process.env.NOTION_PLANS_DB_ID;

        if (!plansDbId) {
            return NextResponse.json({ ok: false, error: "Missing DB ID" });
        }

        const response = await notion.search({
            filter: {
                value: "page",
                property: "object",
            },
            sort: {
                direction: "descending",
                timestamp: "last_edited_time",
            },
            page_size: 50,
        });

        const planPages = response.results.filter(
            (page) =>
                page && typeof page === 'object' && 'parent' in page &&
                (page as NotionPlanPage).parent?.database_id === plansDbId &&
                (page as NotionPlanPage).properties?.["Daily Calorie Target"]
        ) as NotionPlanPage[];

        if (planPages.length > 1) {
            // Sort by Week of date if available, to get most recent
            planPages.sort((a: NotionPlanPage, b: NotionPlanPage) => {
                const dateA = a.properties?.["Week of"]?.date?.start;
                const dateB = b.properties?.["Week of"]?.date?.start;
                if (dateA && dateB) {
                    return (
                        new Date(dateB).getTime() - new Date(dateA).getTime()
                    );
                }
                return 0;
            });
        }

        if (planPages.length === 0) {
            return NextResponse.json({ ok: false, error: "No plans found" });
        }

        const page = planPages[0];
        const targetCalories =
            page.properties["Daily Calorie Target"]?.number || 2000;

        // Get week from "Week of" property
        const weekOf = page.properties["Week of"]?.date?.start;

        // Reconstruct plan from day-based JSON fields
        const days = [];
        const dayNames = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ];

        for (const dayName of dayNames) {
            const dayField =
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (page.properties[dayName] as any)?.rich_text?.[0]?.text?.content;

            if (dayField) {
                try {
                    const meals = JSON.parse(dayField);
                    // Only add day if it has at least one non-empty meal
                    if (
                        meals.breakfast ||
                        meals.lunch ||
                        meals.dinner ||
                        meals.snack
                    ) {
                        days.push({
                            day: dayName,
                            meals: meals,
                            calories_estimate: targetCalories,
                        });
                    }
                } catch {
                    // Silently skip invalid JSON
                }
            }
        }

        // Get grocery list from JSON field
        let groceryList = {};
        const groceryField =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (page.properties["Grocery List"] as any)?.rich_text?.[0]?.text?.content;
        if (groceryField) {
            try {
                groceryList = JSON.parse(groceryField);
            } catch {
                // Silently skip invalid JSON
            }
        }

        const planJson: Partial<MealPlan> = {
            week: weekOf || new Date().toISOString().slice(0, 10),
            target_daily_calories: targetCalories,
            days: days,
            grocery_list: groceryList,
        };

        // Get meals database ID and fetch recipes for this plan
        const mealsDbId = process.env.NOTION_MEALS_DB_ID;
        if (mealsDbId && planJson.days) {
            // Collect unique meal names
            const mealNames = new Set();
            for (const day of planJson.days) {
                if (day.meals) {
                    Object.values(day.meals).forEach((mealName) => {
                        if (mealName && typeof mealName === "string") {
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
                if (
                    page.parent?.database_id === mealsDbId &&
                    page.properties?.Name?.title?.[0]?.text?.content
                ) {
                    const recipeName =
                        page.properties.Name.title[0].text.content;
                    if (mealNames.has(recipeName)) {
                        recipes[recipeName] = {
                            ingredients:
                                page.properties.Ingredients?.rich_text?.[0]?.text?.content?.split(
                                    ", "
                                ) || [],
                            instructions:
                                page.properties.Notes?.rich_text?.[0]?.text
                                    ?.content || "",
                            servings: page.properties.Servings?.number || 1,
                            calories_per_serving:
                                page.properties["Calories per Serving"]
                                    ?.number || 0,
                            protein_per_serving:
                                page.properties["Protein per Serving"]
                                    ?.number || 0,
                            carbs_per_serving:
                                page.properties["Carbs per Serving"]
                                    ?.number || 0,
                            fat_per_serving:
                                page.properties["Fat per Serving"]
                                    ?.number || 0,
                            fiber_per_serving:
                                page.properties["Fiber per Serving"]
                                    ?.number || 0,
                        };
                    }
                }
            }

            // If no grocery list was stored, reconstruct from recipes
            if (!groceryList || Object.keys(groceryList).length === 0) {
                const reconstructedGroceryList: Record<string, string[]> = {};
                for (const [, recipe] of Object.entries(recipes)) {
                    if (
                        recipe.ingredients &&
                        Array.isArray(recipe.ingredients)
                    ) {
                        for (const ingredient of recipe.ingredients) {
                            // Simple categorization based on common ingredients
                            let category = "other";
                            const ing = ingredient.toLowerCase();

                            if (
                                ing.includes("egg") ||
                                ing.includes("milk") ||
                                ing.includes("cheese") ||
                                ing.includes("yogurt")
                            ) {
                                category = "dairy";
                            } else if (
                                ing.includes("chicken") ||
                                ing.includes("beef") ||
                                ing.includes("salmon") ||
                                ing.includes("tuna") ||
                                ing.includes("tofu") ||
                                ing.includes("lentil") ||
                                ing.includes("chickpea")
                            ) {
                                category = "proteins";
                            } else if (
                                ing.includes("spinach") ||
                                ing.includes("broccoli") ||
                                ing.includes("carrot") ||
                                ing.includes("pepper") ||
                                ing.includes("onion") ||
                                ing.includes("tomato")
                            ) {
                                category = "produce";
                            } else if (
                                ing.includes("rice") ||
                                ing.includes("quinoa") ||
                                ing.includes("oats") ||
                                ing.includes("bread")
                            ) {
                                category = "grains";
                            } else if (
                                ing.includes("apple") ||
                                ing.includes("berries") ||
                                ing.includes("banana")
                            ) {
                                category = "produce";
                            } else if (
                                ing.includes("honey") ||
                                ing.includes("oil") ||
                                ing.includes("salt") ||
                                ing.includes("pepper") ||
                                ing.includes("sauce")
                            ) {
                                category = "condiments";
                            }

                            if (!reconstructedGroceryList[category]) {
                                reconstructedGroceryList[category] = [];
                            }

                            // Clean up ingredient (remove quantities)
                            const cleanIngredient = ingredient
                                .replace(
                                    /^\d+\s*(cups?|tbsp|tsp|lbs?|oz|block|can|bunch)?\s*/i,
                                    ""
                                )
                                .trim();
                            if (
                                cleanIngredient &&
                                !reconstructedGroceryList[category].includes(
                                    cleanIngredient
                                )
                            ) {
                                reconstructedGroceryList[category].push(
                                    cleanIngredient
                                );
                            }
                        }
                    }
                }
                planJson.grocery_list = reconstructedGroceryList;
            }

            // Add recipes to the plan
            planJson.recipes = recipes;
        }

        return NextResponse.json({ ok: true, plan: planJson });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ ok: false, error: errorMessage });
    }
}
