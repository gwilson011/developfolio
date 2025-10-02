import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { scaleIngredient } from "@/utils/ingredients";
import { generateGroceryList, validateGroceryIngredients } from "@/utils/grocery";
import { Client } from "@notionhq/client";
import { MEAL_PLAN_CONFIG } from "@/config/meal-plan";
import { NotionPage, MealData, RecipeData, MealPlan, NutritionValidationResult, NutritionAdjustmentResult } from "@/app/types/recipe";
import {
    safeAsyncOperation,
    validateEnvironment
} from "@/utils/error-handling";
import {
    buildMealPlanSystemPrompt,
    buildNutritionValidationPrompt,
    buildNutritionAdjustmentPrompt
} from "@/utils/ai-prompts";
import { PlanSchema } from "@/app/utils/schema";
import { validateMealPlan, validateCalories } from "@/utils/validation";
export const dynamic = "force-dynamic";

// PlanSchema is now imported from centralized schema file

// Grocery list validation is now handled by utility functions

async function fetchKnownMeals() {
    if (!process.env.NOTION_TOKEN || !process.env.NOTION_MEALS_DB_ID) {
        console.warn("[fetchKnownMeals] Missing Notion credentials, skipping");
        return [];
    }

    const result = await safeAsyncOperation(async () => {
        const notion = new Client({ auth: process.env.NOTION_TOKEN });
        const mealsDbId = process.env.NOTION_MEALS_DB_ID;

        const response = await notion.search({
            filter: { value: "page", property: "object" },
            page_size: 100, // Increased from 50 to get more recipes
        });

        const meals = response.results
            .filter((page: unknown): page is Record<string, unknown> =>
                Boolean(page && typeof page === 'object' && page !== null &&
                'parent' in page && page.parent &&
                typeof page.parent === 'object' && 'database_id' in page.parent &&
                page.parent.database_id === mealsDbId)
            )
            .map((page): MealData => {
                const notionPage = page as NotionPage;
                return {
                    name: notionPage.properties?.Name?.title?.[0]?.text?.content || "Untitled",
                    ingredients:
                        notionPage.properties?.Ingredients?.rich_text?.[0]?.text?.content?.split(
                            ", "
                        ) || [],
                    instructions:
                        notionPage.properties?.Notes?.rich_text?.[0]?.text?.content || "",
                    calories: notionPage.properties?.["Calories per Serving"]?.number || 0,
                    servings: notionPage.properties?.Servings?.number || 1,
                    protein: notionPage.properties?.["Protein per Serving"]?.number || 0,
                    carbs: notionPage.properties?.["Carbs per Serving"]?.number || 0,
                    fat: notionPage.properties?.["Fat per Serving"]?.number || 0,
                    fiber: notionPage.properties?.["Fiber per Serving"]?.number || 0,
                    mealType: notionPage.properties?.["Meal Type"]?.multi_select?.map((type) => type.name) || [],
                    tags: notionPage.properties?.Tags?.multi_select?.map((tag) => tag.name) || [],
                };
            });

        console.log(`[fetchKnownMeals] Loaded ${meals.length} known meals from database`);
        return meals;
    }, [], "fetchKnownMeals");

    return result.data || [];
}

function createRecipeLookup(knownMeals: MealData[]): { [key: string]: MealData } {
    const lookup: { [key: string]: MealData } = {};

    for (const meal of knownMeals) {
        // Store by exact name
        lookup[meal.name] = meal;

        // Also store by normalized name for better matching
        const normalizedName = meal.name.toLowerCase().trim();
        if (!lookup[normalizedName]) {
            lookup[normalizedName] = meal;
        }
    }

    console.log(`[createRecipeLookup] Created lookup for ${Object.keys(lookup).length} recipe variations`);
    return lookup;
}

function enhanceWithKnownRecipes(plan: Partial<MealPlan>, recipeLookup: { [key: string]: MealData }): Partial<MealPlan> {
    const enhancedPlan = JSON.parse(JSON.stringify(plan)); // Deep copy
    let enhancedCount = 0;
    let totalMealsChecked = 0;

    // Collect all unique meal names from the plan
    const allMealNames = new Set<string>();
    if (enhancedPlan.days) {
        for (const day of enhancedPlan.days) {
            ['breakfast', 'lunch', 'dinner', 'snack'].forEach((mealType) => {
                const mealName = day.meals?.[mealType]?.trim();
                if (mealName && mealName !== "Eating Out") {
                    allMealNames.add(mealName);
                }
            });
        }
    }

    console.log(`[enhanceWithKnownRecipes] Checking ${allMealNames.size} unique meals against database`);

    // For each unique meal, check if we have it in our database
    for (const mealName of Array.from(allMealNames)) {
        totalMealsChecked++;

        // Try exact match first
        let knownRecipe = recipeLookup[mealName];

        // Try normalized match if exact fails
        if (!knownRecipe) {
            knownRecipe = recipeLookup[mealName.toLowerCase().trim()];
        }

        if (knownRecipe) {
            // Replace AI-generated recipe with database recipe
            if (!enhancedPlan.recipes) {
                enhancedPlan.recipes = {};
            }
            enhancedPlan.recipes[mealName] = {
                ingredients: knownRecipe.ingredients,
                instructions: knownRecipe.instructions,
                servings: knownRecipe.servings,
                calories_per_serving: knownRecipe.calories,
                protein_per_serving: knownRecipe.protein,
                carbs_per_serving: knownRecipe.carbs,
                fat_per_serving: knownRecipe.fat,
                fiber_per_serving: knownRecipe.fiber,
            };
            enhancedCount++;
            console.log(`[enhanceWithKnownRecipes] ✅ Enhanced "${mealName}" with database recipe`);
        } else {
            console.log(`[enhanceWithKnownRecipes] ⚠️  No database match for "${mealName}" - using AI recipe`);
        }
    }

    console.log(`[enhanceWithKnownRecipes] Enhanced ${enhancedCount}/${totalMealsChecked} meals with database recipes`);
    return enhancedPlan;
}

async function validateNutritionWithAI(plan: Partial<MealPlan>, targets: { calories: number, protein: number, carbs: number, fat: number, fiber: number }, openai: OpenAI): Promise<NutritionValidationResult> {
    // Calculate daily totals from the plan
    const dailyTotals = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0
    };

    // Calculate nutrition for a typical day (use first day as representative)
    if (plan.days && plan.days.length > 0) {
        const firstDay = plan.days[0];
        ['breakfast', 'lunch', 'dinner', 'snack'].forEach((mealType: string) => {
            const mealName = firstDay.meals?.[mealType as keyof typeof firstDay.meals];
            if (mealName && mealName !== "Eating Out" && plan.recipes?.[mealName]) {
                const recipe = plan.recipes[mealName];
                dailyTotals.calories += recipe.calories_per_serving || 0;
                dailyTotals.protein += recipe.protein_per_serving || 0;
                dailyTotals.carbs += recipe.carbs_per_serving || 0;
                dailyTotals.fat += recipe.fat_per_serving || 0;
                dailyTotals.fiber += recipe.fiber_per_serving || 0;
            }
        });
    }

    // Use centralized nutrition validation prompt
    const validationContext = {
        dailyTotals,
        targets,
        plan
    };

    const validationPrompt = buildNutritionValidationPrompt(validationContext);

    try {
        const response = await openai.chat.completions.create({
            model: MEAL_PLAN_CONFIG.API.openai_model,
            temperature: MEAL_PLAN_CONFIG.API.openai_temperature,
            messages: [
                { role: "system", content: "You are a nutrition validation expert. Analyze meal plans for accuracy and provide specific recommendations. Always return valid JSON." },
                { role: "user", content: validationPrompt }
            ],
        });

        let content = response.choices[0]?.message?.content || "{}";

        // Remove markdown code blocks if present
        content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

        const validationResult = JSON.parse(content);

        return {
            calculatedTotals: dailyTotals,
            validation: validationResult
        };
    } catch (error) {
        console.error("[validateNutritionWithAI] Error:", error);
        return {
            calculatedTotals: dailyTotals,
            validation: { needsAdjustment: false, error: "Validation failed" }
        };
    }
}

async function adjustNutritionWithAI(plan: Partial<MealPlan>, validationResult: NutritionValidationResult, openai: OpenAI): Promise<NutritionAdjustmentResult> {
    // Use centralized nutrition adjustment prompt
    const adjustmentContext = {
        validationResult,
        plan
    };

    const adjustmentPrompt = buildNutritionAdjustmentPrompt(adjustmentContext);

    try {
        const response = await openai.chat.completions.create({
            model: MEAL_PLAN_CONFIG.API.openai_model,
            temperature: MEAL_PLAN_CONFIG.API.openai_temperature + 0.1, // Slightly higher for adjustments
            messages: [
                { role: "system", content: "You are a nutrition adjustment expert. Modify meal plans to meet nutrition targets while maintaining recipe coherence. Always return valid JSON." },
                { role: "user", content: adjustmentPrompt }
            ],
        });

        let content = response.choices[0]?.message?.content || "{}";

        // Remove markdown code blocks if present
        content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

        const adjustmentResult = JSON.parse(content);

        // Validate the adjusted plan structure
        const parsed = PlanSchema.safeParse(adjustmentResult.plan);
        if (!parsed.success) {
            return {
                success: false,
                error: "Adjusted plan has invalid structure",
                details: parsed.error.issues
            };
        }

        // Merge adjusted plan with original to preserve recipe data
        const mergedPlan = {
            ...adjustmentResult.plan,
            recipes: {
                ...plan.recipes, // Keep original recipes
                ...adjustmentResult.plan.recipes // Override with any new/modified recipes
            }
        };

        return {
            success: true,
            plan: mergedPlan,
            adjustmentsMade: adjustmentResult.adjustmentsMade || []
        };
    } catch (error) {
        console.error("[adjustNutritionWithAI] Error:", error);
        return {
            success: false,
            error: "Failed to adjust nutrition",
            details: error
        };
    }
}

export async function POST(req: NextRequest) {
    try {
        // Validate environment variables using centralized function
        const envError = validateEnvironment(['OPENAI_API_KEY'], '/api/plan');
        if (envError) return envError;
        const body = await req.json();
        const {
            preferences,
            weekStartISO,
            knownMeals = [],
            dailyCalories,
            daysOutOfTown = [],
            mealsOut = [],
            instructions,
            selectedKnownMeals = [],
        } = body ?? {};

        // Validate calories using centralized function
        const caloriesValidation = validateCalories(dailyCalories);
        if (!caloriesValidation.success) {
            return NextResponse.json(
                {
                    ok: false,
                    error: caloriesValidation.error,
                    context: '/api/plan'
                },
                { status: 400 }
            );
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // PHASE 0: FETCH KNOWN MEALS FROM DATABASE
        console.log("[/api/plan] Fetching known meals from database...");
        const knownMealsFromDB = await fetchKnownMeals();
        const recipeLookup = createRecipeLookup(knownMealsFromDB);
        console.log("[/api/plan] Database setup complete");

        // Build day-by-day meal constraints
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const dayConstraints = [];

        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            const dayName = dayNames[dayIndex];
            const isOutOfTown = daysOutOfTown[dayIndex];
            const dayMealsOut = mealsOut[dayIndex];

            if (isOutOfTown) {
                // If out of town, ALL meals are eating out
                dayConstraints.push(`${dayName}: ALL MEALS must be "Eating Out" (user is traveling)`);
            } else if (dayMealsOut) {
                // Check for specific meals out on this day
                const specificMealsOut = [];
                if (dayMealsOut.breakfast) specificMealsOut.push('breakfast');
                if (dayMealsOut.lunch) specificMealsOut.push('lunch');
                if (dayMealsOut.dinner) specificMealsOut.push('dinner');

                if (specificMealsOut.length > 0) {
                    dayConstraints.push(`${dayName}: ${specificMealsOut.join(', ')} must be "Eating Out"`);
                }
            }
        }

        // Travel days tracking removed as it was unused

        // Use centralized prompt system
        const promptContext = {
            dailyCalories,
            knownMealsFromDB,
            dayConstraints,
            selectedKnownMeals,
            instructions
        };

        const sys = buildMealPlanSystemPrompt(promptContext);

        const user = {
            known_meals: knownMeals,
            preferences,
            week: weekStartISO,
            days_out_of_town: daysOutOfTown,
            meals_out: mealsOut,
            additional_instructions: instructions,
            selected_known_meals: selectedKnownMeals,
            output_format: "JSON only",
        };

        const resp = await openai.chat.completions.create({
            model: MEAL_PLAN_CONFIG.API.openai_model,
            temperature: MEAL_PLAN_CONFIG.API.openai_temperature,
            messages: [
                { role: "system", content: sys },
                { role: "user", content: JSON.stringify(user) },
            ],
        });

        const text = resp.choices?.[0]?.message?.content ?? "";
        console.log("[/api/plan] raw model output:", text.slice(0, 500));

        // Log the full response for debugging grocery list issues
        console.log("[/api/plan] full model response:", text);

        let parsedJson: unknown;
        try {
            parsedJson = JSON.parse(text);
        } catch {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Model did not return JSON",
                    detail: text.slice(0, 2000),
                },
                { status: 500 }
            );
        }

        const validation = validateMealPlan(parsedJson);
        if (!validation.success) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Invalid plan JSON shape",
                    zodIssues: validation.issues,
                    preview: JSON.stringify(parsedJson).slice(0, 2000),
                },
                { status: 500 }
            );
        }
        const parsed = { data: validation.data };

        // PHASE 1: ENHANCE WITH KNOWN RECIPES
        console.log("[/api/plan] Enhancing plan with database recipes...");
        if (!parsed.data) {
            return NextResponse.json(
                { ok: false, error: "No plan data after validation" },
                { status: 500 }
            );
        }
        const enhancedPlan = enhanceWithKnownRecipes(parsed.data, recipeLookup);

        // Validate that grocery list contains all recipe ingredients (use enhanced plan)
        const validationResults = validateGroceryIngredients(enhancedPlan.recipes, enhancedPlan.grocery_list);
        if (validationResults.missingIngredients.length > 0) {
            console.warn("[/api/plan] Missing ingredients in grocery list:", validationResults.missingIngredients);
            console.log("[/api/plan] All recipe ingredients:", validationResults.allRecipeIngredients);
            console.log("[/api/plan] Grocery list ingredients:", validationResults.groceryIngredients);
        }

        // PHASE 1.5: ALIGN RECIPE SERVINGS WITH MEAL PLAN USAGE
        console.log("[/api/plan] Aligning recipe servings with meal plan usage...");
        const alignmentResult = alignRecipeServingsWithUsage(enhancedPlan);
        const alignedPlan = alignmentResult.alignedPlan;
        const originalRecipes = alignmentResult.originalRecipes;
        console.log("[/api/plan] Serving alignment completed");

        // AGENTIC NUTRITION VALIDATION
        const nutritionTargets = {
            calories: dailyCalories,
            protein: MEAL_PLAN_CONFIG.NUTRITION_TARGETS.protein,
            carbs: MEAL_PLAN_CONFIG.NUTRITION_TARGETS.carbs,
            fat: MEAL_PLAN_CONFIG.NUTRITION_TARGETS.fat,
            fiber: MEAL_PLAN_CONFIG.NUTRITION_TARGETS.fiber
        };

        console.log("[/api/plan] Starting nutrition validation...");
        const nutritionValidation = await validateNutritionWithAI(alignedPlan, nutritionTargets, openai);

        console.log("[/api/plan] Calculated daily totals:", nutritionValidation.calculatedTotals);
        console.log("[/api/plan] Nutrition validation:", nutritionValidation.validation);

        if (nutritionValidation.validation.needsAdjustment) {
            console.warn("[/api/plan] Nutrition gaps found:", nutritionValidation.validation.nutritionGaps);
            console.log("[/api/plan] Suggested adjustments:", nutritionValidation.validation.adjustmentSuggestions);

            // PHASE 2: AUTOMATIC ADJUSTMENT AGENT
            console.log("[/api/plan] Applying automatic nutrition adjustments...");
            const adjustedPlan = await adjustNutritionWithAI(alignedPlan, nutritionValidation, openai);

            if (adjustedPlan.success && adjustedPlan.plan) {
                console.log("[/api/plan] Successfully adjusted meal plan for nutrition targets");

                // Re-apply serving alignment to adjusted plan using original recipes baseline
                console.log("[/api/plan] Re-applying serving alignment to nutrition-adjusted plan...");
                const finalAlignmentResult = alignRecipeServingsWithUsage(adjustedPlan.plan, originalRecipes);
                const finalAlignedPlan = finalAlignmentResult.alignedPlan;

                // Ensure original baseline is preserved for any future operations
                console.log("[/api/plan] Preserving original recipe baseline after nutrition adjustment");

                // Re-validate the adjusted plan
                const revalidation = await validateNutritionWithAI(finalAlignedPlan, nutritionTargets, openai);
                console.log("[/api/plan] Post-adjustment totals:", revalidation.calculatedTotals);

                return NextResponse.json({
                    ok: true,
                    plan: finalAlignedPlan,
                    nutritionAnalysis: {
                        original: {
                            calculatedTotals: nutritionValidation.calculatedTotals,
                            validation: nutritionValidation.validation
                        },
                        adjusted: {
                            calculatedTotals: revalidation.calculatedTotals,
                            validation: revalidation.validation
                        },
                        targets: nutritionTargets,
                        adjustmentsMade: adjustedPlan.adjustmentsMade
                    }
                });
            } else {
                console.error("[/api/plan] Failed to adjust nutrition:", adjustedPlan.error);
            }
        }

        return NextResponse.json({
            ok: true,
            plan: alignedPlan,
            nutritionAnalysis: {
                calculatedTotals: nutritionValidation.calculatedTotals,
                targets: nutritionTargets,
                validation: nutritionValidation.validation
            }
        });
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        console.error("[/api/plan] error:", errorMessage);
        return NextResponse.json(
            { ok: false, error: errorMessage },
            { status: 500 }
        );
    }
}

function alignRecipeServingsWithUsage(plan: Partial<MealPlan>, originalRecipes?: Record<string, RecipeData>): {
    alignedPlan: Partial<MealPlan>;
    originalRecipes: Record<string, RecipeData>;
} {
    // Store original recipes as baseline on first call
    if (!originalRecipes) {
        originalRecipes = JSON.parse(JSON.stringify(plan.recipes || {}));
        console.log("[alignRecipeServingsWithUsage] Storing original recipes as baseline");
    }

    // Count how many times each recipe appears in the meal plan
    const recipeUsageCount = new Map<string, number>();

    // Iterate through all days and meals to count recipe usage
    for (const day of plan.days || []) {
        for (const mealType of ['breakfast', 'lunch', 'dinner', 'snack']) {
            const mealName = day.meals?.[mealType]?.trim();
            if (mealName && mealName !== "Eating Out") {
                recipeUsageCount.set(mealName, (recipeUsageCount.get(mealName) || 0) + 1);
            }
        }
    }

    console.log("[alignRecipeServingsWithUsage] Recipe usage counts:", Object.fromEntries(recipeUsageCount));

    // Create a deep copy of the plan to avoid mutating the original
    const alignedPlan: Partial<MealPlan> = JSON.parse(JSON.stringify(plan));

    // Align recipe servings with usage frequency and scale ingredients
    for (const [recipeName, usageCount] of Array.from(recipeUsageCount.entries())) {
        const currentRecipe = alignedPlan.recipes?.[recipeName];
        const originalRecipe = originalRecipes?.[recipeName];

        if (currentRecipe && originalRecipe && originalRecipe.servings !== usageCount) {
            const originalServings = originalRecipe.servings;
            const scalingFactor = usageCount / originalServings;

            console.log(`[alignRecipeServingsWithUsage] Adjusting "${recipeName}": ${originalServings} servings → ${usageCount} servings (scale: ${scalingFactor.toFixed(2)}) [scaling from original]`);

            // Update serving count
            currentRecipe.servings = usageCount;

            // Scale ingredient quantities from original baseline
            if (originalRecipe.ingredients && Array.isArray(originalRecipe.ingredients)) {
                currentRecipe.ingredients = originalRecipe.ingredients.map((ingredient: string) => {
                    return scaleIngredient(ingredient, scalingFactor);
                });
            }

            // Note: Nutrition per serving stays the same since it's "per serving"
            // Total nutrition scales with serving count automatically
        }
    }

    // Recalculate grocery list based on new ingredient quantities
    if (alignedPlan.recipes) {
        console.log("[alignRecipeServingsWithUsage] Generating grocery list from scaled recipes...");
        alignedPlan.grocery_list = generateGroceryList(alignedPlan.recipes);

        // Validate grocery list completeness
        const validationResults = validateGroceryIngredients(alignedPlan.recipes, alignedPlan.grocery_list);
        if (validationResults.missingIngredients.length > 0) {
            console.warn("[alignRecipeServingsWithUsage] Missing ingredients in grocery list:", validationResults.missingIngredients);
        }

        // Log grocery list summary
        const totalItems = Object.values(alignedPlan.grocery_list || {}).reduce((sum: number, items) => sum + (items as string[]).length, 0);
        const categories = Object.keys(alignedPlan.grocery_list || {}).length;
        console.log(`[alignRecipeServingsWithUsage] Generated grocery list: ${totalItems} items across ${categories} categories`);

        // Log any cooking-to-shopping conversions that were applied
        console.log("[alignRecipeServingsWithUsage] System-generated grocery list now uses shopping-friendly quantities");
    }

    // Return both the aligned plan and the original recipes for future scaling operations
    return { alignedPlan, originalRecipes: originalRecipes || {} };
}
