import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
export const dynamic = "force-dynamic";

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
                    snack: z.string(),
                }),
                calories_estimate: z.number().optional(),
            })
        )
        .length(7),
    grocery_list: z.record(z.string(), z.array(z.string())),
    recipes: z.record(
        z.object({
            ingredients: z.array(z.string()),
            instructions: z.string(),
            servings: z.number(),
            calories_per_serving: z.number(),
            protein_per_serving: z.number(),
            carbs_per_serving: z.number(),
            fat_per_serving: z.number(),
            fiber_per_serving: z.number(),
        })
    ),
    target_daily_calories: z.number(),
});

function validateGroceryList(plan: any) {
    // Get all ingredients from all recipes
    const allRecipeIngredients = new Set<string>();

    // Extract ingredients from each recipe
    Object.entries(plan.recipes || {}).forEach(([recipeName, recipe]: [string, any]) => {
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
            recipe.ingredients.forEach((ingredient: string) => {
                // Normalize ingredient name (remove quantities, lowercase, trim)
                const normalized = ingredient.toLowerCase()
                    .replace(/^\d+(\.\d+)?\s*(cups?|tbsp|tsp|lbs?|oz|cloves?|slices?|pieces?|medium|large|small|bunch|bag|can|bottle)?\s*/i, '')
                    .trim();
                if (normalized) {
                    allRecipeIngredients.add(normalized);
                }
            });
        }
    });

    // Get all ingredients from grocery list
    const groceryIngredients = new Set<string>();
    Object.entries(plan.grocery_list || {}).forEach(([category, items]: [string, any]) => {
        if (Array.isArray(items)) {
            items.forEach((item: string) => {
                // Normalize grocery item name (remove quantities, lowercase, trim)
                const normalized = item.toLowerCase()
                    .replace(/^\d+(\.\d+)?\s*(cups?|tbsp|tsp|lbs?|oz|cloves?|slices?|pieces?|medium|large|small|bunch|bag|can|bottle)?\s*/i, '')
                    .trim();
                if (normalized) {
                    groceryIngredients.add(normalized);
                }
            });
        }
    });

    // Find missing ingredients
    const missingIngredients = Array.from(allRecipeIngredients).filter(
        ingredient => !groceryIngredients.has(ingredient)
    );

    return {
        allRecipeIngredients: Array.from(allRecipeIngredients),
        groceryIngredients: Array.from(groceryIngredients),
        missingIngredients
    };
}

async function validateNutritionWithAI(plan: any, targets: { calories: number, protein: number, carbs: number, fat: number, fiber: number }, openai: OpenAI) {
    // Calculate daily totals from the plan
    let dailyTotals = {
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
            const mealName = firstDay.meals?.[mealType];
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

    // Use AI to validate nutrition accuracy
    const validationPrompt = `
    NUTRITION VALIDATION AGENT

    Analyze this meal plan for nutrition accuracy:

    CALCULATED DAILY TOTALS:
    - Calories: ${dailyTotals.calories}
    - Protein: ${dailyTotals.protein}g
    - Carbs: ${dailyTotals.carbs}g
    - Fat: ${dailyTotals.fat}g
    - Fiber: ${dailyTotals.fiber}g

    TARGETS:
    - Calories: ${targets.calories}
    - Protein: ${targets.protein}g
    - Carbs: ${targets.carbs}g
    - Fat: ${targets.fat}g
    - Fiber: ${targets.fiber}g

    RECIPES TO VALIDATE:
    ${Object.entries(plan.recipes || {}).map(([name, recipe]: [string, any]) =>
        `${name}: ${recipe.ingredients?.join(', ')}
         Claimed: ${recipe.calories_per_serving}cal, ${recipe.protein_per_serving}g protein, ${recipe.carbs_per_serving}g carbs, ${recipe.fat_per_serving}g fat, ${recipe.fiber_per_serving}g fiber`
    ).join('\n')}

    Tasks:
    1. Verify if recipe nutrition values seem accurate based on ingredients
    2. Identify any significant gaps vs targets (>15% off)
    3. Suggest specific fixes if needed

    Return JSON only:
    {
        "dailyTotalsAccurate": true/false,
        "recipeAccuracy": {"recipeName": "accurate/low/high", ...},
        "nutritionGaps": ["25g protein deficit", "150 calorie surplus", ...],
        "needsAdjustment": true/false,
        "adjustmentSuggestions": ["Add 6oz chicken breast to dinner for +40g protein", ...]
    }
    `;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.2,
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

async function adjustNutritionWithAI(plan: any, validationResult: any, openai: OpenAI) {
    const adjustmentPrompt = `
    NUTRITION ADJUSTMENT AGENT

    TASK: Modify this meal plan to fix nutrition gaps while maintaining recipe coherence.

    CURRENT NUTRITION GAPS:
    ${validationResult.nutritionGaps?.join('\n    ') || 'None specified'}

    SUGGESTED ADJUSTMENTS:
    ${validationResult.adjustmentSuggestions?.join('\n    ') || 'None specified'}

    CURRENT MEAL PLAN:
    ${JSON.stringify(plan, null, 2)}

    INSTRUCTIONS:
    1. Apply the suggested adjustments to fix nutrition gaps
    2. Add ingredients to existing recipes (don't create new recipes)
    3. Prioritize protein additions first, then fat, then adjust carbs
    4. Ensure additions make culinary sense (chicken to stir-fry, nuts to salad, etc.)
    5. Update ingredient lists AND nutrition values for modified recipes
    6. Recalculate grocery_list to include new ingredients

    ADJUSTMENT PRIORITIES:
    - Protein deficit: Add chicken, fish, eggs, Greek yogurt, beans
    - Fat deficit: Add olive oil, nuts, avocado, seeds
    - Carb surplus: Replace simple carbs with vegetables or reduce portions
    - Fiber deficit: Add berries, vegetables, whole grains

    Return the complete modified meal plan in the same JSON format with:
    - Updated recipe ingredients
    - Updated nutrition values per serving
    - Updated grocery_list
    - List of changes made

    Return JSON only in this format:
    {
        "plan": { /* complete modified meal plan */ },
        "adjustmentsMade": ["Added 6oz chicken breast to Quinoa Stir-Fry", "Added 1 tbsp olive oil to salad", ...]
    }
    `;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.3,
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

        return {
            success: true,
            plan: adjustmentResult.plan,
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
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { ok: false, error: "OPENAI_API_KEY missing" },
                { status: 500 }
            );
        }
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

        // Validate dailyCalories
        if (
            !dailyCalories ||
            typeof dailyCalories !== "number" ||
            dailyCalories < 1000 ||
            dailyCalories > 5000
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "dailyCalories must be a number between 1000 and 5000",
                },
                { status: 400 }
            );
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

        const travelDays = daysOutOfTown.map((isOut, index) => isOut ? dayNames[index] : null).filter(Boolean);

        const sys = `You are a meal-planning assistant. Target ${dailyCalories} calories per day.
            Output strict JSON with these exact keys:
            1. week: string
            2. days: array of 7 day objects with {day, meals{breakfast,lunch,dinner,snack}, calories_estimate}
            3. grocery_list: object with categories as keys and ingredient arrays as values
            4. recipes: object where each meal name is a key with {ingredients: string[], instructions: string, servings: number, calories_per_serving: number, protein_per_serving: number, carbs_per_serving: number, fat_per_serving: number, fiber_per_serving: number}
            5. target_daily_calories: number

            CALORIE DISTRIBUTION: Breakfast 20%, Lunch 30%, Dinner 35%, Snack 15% of daily calories.

            MEAL CONSTRAINTS - CRITICAL REQUIREMENTS:
            ${dayConstraints.length > 0 ? dayConstraints.map(constraint => `- ${constraint}`).join('\n            ') : '- No special meal constraints this week.'}

            IMPORTANT: For any meal marked as "Eating Out", use EXACTLY the text "Eating Out" in the meal plan and do NOT create a recipe for it.

            PREFERRED MEALS: ${selectedKnownMeals.length > 0 ? `User has selected these preferred meals to include: ${selectedKnownMeals.join(', ')}. Try to incorporate these into the weekly plan where appropriate.` : 'No specific meal preferences provided.'}

            CUSTOM INSTRUCTIONS: ${instructions ? instructions : 'No additional instructions provided.'}

            MEAL VARIETY STRUCTURE:
            - Breakfasts: Create 2-3 different recipes that alternate throughout the week
            - Lunches: Create 2-3 different recipes that alternate throughout the week
            - Dinners: Create 2-3 different recipes that alternate throughout the week
            - Snacks: Create 3-4 simple options that rotate daily

            BATCH COOKING OPTIMIZATION:
            - Each recipe should yield 3-4 servings for multiple days
            - Plan meals to require cooking only 2-3 times per week maximum
            - Choose recipes that store and reheat well (grain bowls, stir-fries, soups)
            - Rotate meals every 2-3 days for variety while maintaining efficiency
            - Consider food longevity for travel days

            ROTATION STRATEGY EXAMPLE:
            - Lunch A: Mon, Wed, Fri (3 portions)
            - Lunch B: Tue, Thu (2 portions)
            - Lunch C: Sat, Sun (2 portions)

            FLAVOR DIVERSITY: Use complementary flavors and cooking methods across recipes. Avoid repetitive cuisines.

            SNACK REQUIREMENTS: Include simple 200-300 calorie snacks (fruit, nuts, yogurt, etc.)

            GROCERY LIST REQUIREMENTS - CRITICAL:
            - MUST include every single ingredient from every recipe you create
            - Show exact quantities needed from all planned recipes and meals
            - Calculate total weekly usage across ALL planned recipes and meals
            - Use precise measurements that match recipe requirements
            - Account for travel days and meals out (reduce quantities accordingly)
            - Provide specific amounts so user can decide what to buy vs. use from existing supplies
            - Examples: "4 eggs", "1 banana", "2.5 lbs chicken breast", "3 cups baby spinach", "1/2 cup olive oil"

            GROCERY LIST GENERATION PROCESS - FOLLOW EXACTLY:
            1. List ALL ingredients from ALL recipes (except "Eating Out" meals)
            2. For each ingredient, sum up quantities across all recipe uses for the week
            3. Factor in how many times each recipe is made and recipe serving sizes
            4. Categorize ingredients logically (Proteins, Vegetables, Pantry, Dairy, etc.)
            5. Double-check that EVERY recipe ingredient appears somewhere in grocery_list

            QUANTITY CALCULATION LOGIC:
            - Sum exact ingredient needs across ALL planned meals for the week
            - Factor in recipe servings and how many times each meal is prepared
            - Use precise measurements from recipes (preserve fractions like 1/2 cup, 3/4 lb)
            - Account for days out of town and meals eating out to avoid overbuying
            - Show actual amounts needed so user can assess what they already have at home

            VALIDATION REQUIREMENT:
            - Before finalizing, verify that every ingredient from every recipe appears in grocery_list
            - No ingredient from any recipe should be missing from the grocery list

            SERVING SIZE & CALORIE VALIDATION - CRITICAL:
            Ensure ingredient quantities produce BOTH realistic portions AND claimed calories:

            REALISTIC PORTION GUIDELINES:
            - Breakfast (${Math.round(dailyCalories * 0.2)} cal): Must include adequate protein + carbs for satisfying morning meal
            - Lunch (${Math.round(dailyCalories * 0.3)} cal): Substantial midday meal with proper protein + vegetables + carbs
            - Dinner (${Math.round(dailyCalories * 0.35)} cal): Largest meal with generous portions of all components
            - Snacks (${Math.round(dailyCalories * 0.15)} cal): Appropriate snack-sized portions, not mini-meals

            INGREDIENT-CALORIE ALIGNMENT:
            - Verify ingredient quantities actually yield claimed calories_per_serving
            - For 4 servings at 600 calories each: ingredients must realistically total 2400 calories
            - Include adequate protein: minimum 4-6 oz protein equivalent per dinner serving
            - Include substantial carbs: 1-2 cups cooked grains/starch per serving for main meals
            - Add sufficient vegetables: generous portions that make meals satisfying

            PORTION VALIDATION EXAMPLES:
            - 600-calorie dinner for 4 people requires: 1+ lb protein + 2+ cups grains + vegetables + fats
            - 400-calorie lunch for 4 people requires: 6+ oz protein + substantial carbs + vegetables
            - Ingredients should produce adult-sized portions, not child-sized portions

            CALORIE CROSS-CHECK:
            - Calculate estimated calories from ingredients (protein: 4 cal/g, carbs: 4 cal/g, fat: 9 cal/g)
            - Ensure total ingredient calories ÷ servings matches claimed calories_per_serving
            - If ingredients seem insufficient for claimed calories, increase quantities or adjust serving count

            BASIC NUTRITION TRACKING:
            - Calculate approximate protein, carbs, fat, and fiber for each recipe using your nutrition knowledge
            - Include these values in the recipe objects as per_serving amounts
            - Aim for balanced nutrition across meals but don't stress perfect precision yet
            - This is initial estimation - will be validated and adjusted in a separate step

            INGREDIENT OPTIMIZATION: Maximize ingredient overlap to minimize grocery items while maintaining variety. Account for reduced cooking needs due to travel and dining out.
            REQUIRED: Include recipes section with every unique meal AND snack. US measurements. JSON only.`;

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
            model: "gpt-4o-mini",
            temperature: 0.2,
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

        // Validate that grocery list contains all recipe ingredients
        const validationResults = validateGroceryList(parsed.data);
        if (validationResults.missingIngredients.length > 0) {
            console.warn("[/api/plan] Missing ingredients in grocery list:", validationResults.missingIngredients);
            console.log("[/api/plan] All recipe ingredients:", validationResults.allRecipeIngredients);
            console.log("[/api/plan] Grocery list ingredients:", validationResults.groceryIngredients);
        }

        // AGENTIC NUTRITION VALIDATION
        const nutritionTargets = {
            calories: dailyCalories,
            protein: 120, // TODO: Make this configurable from UI
            carbs: 150,   // TODO: Make this configurable from UI
            fat: 50,      // TODO: Make this configurable from UI
            fiber: 25     // TODO: Make this configurable from UI
        };

        console.log("[/api/plan] Starting nutrition validation...");
        const nutritionValidation = await validateNutritionWithAI(parsed.data, nutritionTargets, openai);

        console.log("[/api/plan] Calculated daily totals:", nutritionValidation.calculatedTotals);
        console.log("[/api/plan] Nutrition validation:", nutritionValidation.validation);

        if (nutritionValidation.validation.needsAdjustment) {
            console.warn("[/api/plan] Nutrition gaps found:", nutritionValidation.validation.nutritionGaps);
            console.log("[/api/plan] Suggested adjustments:", nutritionValidation.validation.adjustmentSuggestions);

            // PHASE 2: AUTOMATIC ADJUSTMENT AGENT
            console.log("[/api/plan] Applying automatic nutrition adjustments...");
            const adjustedPlan = await adjustNutritionWithAI(parsed.data, nutritionValidation.validation, openai);

            if (adjustedPlan.success) {
                console.log("[/api/plan] Successfully adjusted meal plan for nutrition targets");

                // Re-validate the adjusted plan
                const revalidation = await validateNutritionWithAI(adjustedPlan.plan, nutritionTargets, openai);
                console.log("[/api/plan] Post-adjustment totals:", revalidation.calculatedTotals);

                return NextResponse.json({
                    ok: true,
                    plan: adjustedPlan.plan,
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
            plan: parsed.data,
            nutritionAnalysis: {
                calculatedTotals: nutritionValidation.calculatedTotals,
                targets: nutritionTargets,
                validation: nutritionValidation.validation
            }
        });
    } catch (e: any) {
        console.error("[/api/plan] error:", e?.message, e?.stack);
        return NextResponse.json(
            { ok: false, error: e?.message ?? "Unknown error" },
            { status: 500 }
        );
    }
}
