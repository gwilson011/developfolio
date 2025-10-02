// Centralized AI prompt builders for meal planning system

import { MEAL_PLAN_CONFIG } from '@/config/meal-plan';

export interface MealPlanPromptContext {
    dailyCalories: number;
    knownMealsFromDB: any[];
    dayConstraints: string[];
    selectedKnownMeals: string[];
    instructions?: string;
}

export interface ValidationPromptContext {
    dailyTotals: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
    };
    targets: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
    };
    plan: any;
}

export interface AdjustmentPromptContext {
    validationResult: any;
    plan: any;
}

/**
 * Build comprehensive meal planning system prompt
 */
export function buildMealPlanSystemPrompt(context: MealPlanPromptContext): string {
    const { dailyCalories, knownMealsFromDB, dayConstraints, selectedKnownMeals, instructions } = context;

    // Build existing recipes context for AI
    const existingRecipesContext = knownMealsFromDB.length > 0 ?
        `\n\nEXISTING RECIPES DATABASE - USE THESE WHEN AVAILABLE:
        ${knownMealsFromDB.map(meal =>
            `${meal.name}: ${meal.ingredients.join(', ')}
             (${meal.servings} servings, ${meal.calories_per_serving}cal, ${meal.protein_per_serving}g protein, ${meal.carbs_per_serving}g carbs, ${meal.fat_per_serving}g fat, ${meal.fiber_per_serving}g fiber)
             Instructions: ${meal.instructions}`
        ).join('\n\n')}
        RECIPE USAGE INSTRUCTIONS:
        - If a planned meal name EXACTLY matches a recipe above, use that recipe's data instead of generating new
        - For exact matches, copy the ingredients, instructions, and nutrition values precisely
        - You may adjust serving sizes if needed, but maintain the per-serving nutrition ratios
        - Only generate new recipes for meals NOT found in the existing database
        - Use existing recipes as reference for nutrition value accuracy
        ` : '';

    return `You are a meal-planning assistant. Target ${dailyCalories} calories per day.
        Output strict JSON with these exact keys:
        1. week: string
        2. days: array of 7 day objects with {day, meals{breakfast,lunch,dinner,snack}, calories_estimate}
        3. recipes: object where each meal name is a key with {ingredients: string[], instructions: string, servings: number, calories_per_serving: number, protein_per_serving: number, carbs_per_serving: number, fat_per_serving: number, fiber_per_serving: number}
        4. target_daily_calories: number

        CRITICAL: Do NOT include grocery_list in your response - this will be calculated automatically by the system after recipe optimization and scaling.

        CALORIE DISTRIBUTION: Breakfast 20%, Lunch 30%, Dinner 35%, Snack 15% of daily calories.${existingRecipesContext}

        MEAL CONSTRAINTS - CRITICAL REQUIREMENTS:
        ${dayConstraints.length > 0 ? dayConstraints.map(constraint => `- ${constraint}`).join('\n        ') : '- No special meal constraints this week.'}

        IMPORTANT: For any meal marked as "Eating Out", use EXACTLY the text "Eating Out" in the meal plan and do NOT create a recipe for it.

        PREFERRED MEALS - CRITICAL REQUIREMENT: ${selectedKnownMeals.length > 0 ? `User has SPECIFICALLY SELECTED these meals and they MUST appear in the meal plan: ${selectedKnownMeals.join(', ')}. These are GUARANTEED requirements - include each selected meal at least once in the weekly plan. Do not treat these as optional suggestions.` : 'No specific meal preferences provided.'}

        CUSTOM INSTRUCTIONS: ${instructions ? instructions : 'No additional instructions provided.'}

        MEAL VARIETY REQUIREMENTS - MANDATORY:
        - BREAKFASTS: Create 2-3 different breakfast recipes, can repeat for 2-3 consecutive days
        - LUNCHES: Create 2-3 different lunch recipes, can repeat for 2-3 consecutive days
        - DINNERS: Create 2-3 different dinner recipes, can repeat for 2-3 consecutive days
        - SNACKS: Create 3-4 different snack options, rotate throughout the week
        - Each meal type should have AT LEAST 2 different recipes across the week
        - It's okay to have the same meal 2-3 days in a row for meal prep efficiency

        PRACTICAL ROTATION EXAMPLES:
        - Breakfast A: Mon-Tue-Wed (batch prep), Breakfast B: Thu-Fri-Sat, Breakfast C: Sun
        - Lunch A: Mon-Wed (batch), Lunch B: Tue-Thu-Fri (batch), Lunch C: Sat-Sun
        - Dinner A: Mon-Tue (batch), Dinner B: Wed-Thu-Fri (larger batch), Dinner C: Sat-Sun
        - Allow for practical meal prep while ensuring weekly variety

        BATCH COOKING OPTIMIZATION:
        - Each recipe should yield 3-4 servings for multiple days
        - Plan meals to require cooking only 2-3 times per week maximum
        - Choose recipes that store and reheat well (grain bowls, stir-fries, soups)
        - Rotate meals every 2-3 days for variety while maintaining efficiency

        CUISINE & FLAVOR DIVERSITY REQUIREMENTS:
        - Use different cooking methods: grilling, roasting, stir-frying, slow cooking
        - Include diverse cuisines: Mediterranean, Asian, Mexican, American, etc.
        - Vary protein sources: chicken, fish, beef, beans, eggs, tofu
        - Different carb bases: rice, quinoa, pasta, potatoes, bread
        - NO repetitive flavor profiles within the same week

        SNACK REQUIREMENTS: Include simple 200-300 calorie snacks (fruit, nuts, yogurt, etc.)

        RECIPE FOCUS: Create detailed, practical recipes with realistic ingredient quantities for the specified serving sizes. The system will automatically calculate grocery lists based on actual meal plan usage.

        SERVING SIZE & CALORIE VALIDATION - CRITICAL:
        Ensure ingredient quantities produce BOTH realistic portions AND claimed calories:

        REALISTIC PORTION GUIDELINES:
        - Breakfast (${Math.round(dailyCalories * MEAL_PLAN_CONFIG.CALORIE_DISTRIBUTION.breakfast)} cal): Must include adequate protein + carbs for satisfying morning meal
        - Lunch (${Math.round(dailyCalories * MEAL_PLAN_CONFIG.CALORIE_DISTRIBUTION.lunch)} cal): Substantial midday meal with proper protein + vegetables + carbs
        - Dinner (${Math.round(dailyCalories * MEAL_PLAN_CONFIG.CALORIE_DISTRIBUTION.dinner)} cal): Largest meal with generous portions of all components
        - Snacks (${Math.round(dailyCalories * MEAL_PLAN_CONFIG.CALORIE_DISTRIBUTION.snack)} cal): Appropriate snack-sized portions, not mini-meals

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

        INGREDIENT OPTIMIZATION: Maximize ingredient overlap to minimize grocery shopping complexity while maintaining meal variety. Account for reduced cooking needs due to travel and dining out.

        VARIETY VALIDATION CHECKLIST - VERIFY BEFORE SUBMITTING:
        ✓ Each meal type (breakfast/lunch/dinner) has at least 2-3 different recipes
        ✓ No single recipe dominates the entire week (max 4 days for any one recipe)
        ✓ Different cuisines and cooking methods are represented across recipes
        ✓ Protein sources vary across the week's recipes
        ✓ At least 3-4 different snack options are included
        ✓ Practical for meal prep while maintaining variety

        COMMON VARIETY MISTAKES TO AVOID:
        ❌ Same breakfast every single day (e.g., "Scrambled Eggs" all 7 days)
        ❌ Same lunch every single day (e.g., "Chicken Salad" all 7 days)
        ❌ Same dinner every single day (e.g., "Grilled Chicken" all 7 days)
        ❌ Only 1 recipe total for any meal category across the entire week
        ✅ OKAY: Same breakfast Mon-Tue-Wed, different Thu-Fri-Sat-Sun

        REQUIRED: Include recipes section with every unique meal AND snack. Use US measurements and return JSON only.`;
}

/**
 * Build nutrition validation prompt
 */
export function buildNutritionValidationPrompt(context: ValidationPromptContext): string {
    const { dailyTotals, targets, plan } = context;

    return `
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
         Claimed: ${recipe.servings} servings, ${recipe.calories_per_serving}cal, ${recipe.protein_per_serving}g protein, ${recipe.carbs_per_serving}g carbs, ${recipe.fat_per_serving}g fat, ${recipe.fiber_per_serving}g fiber`
    ).join('\n')}

    Tasks:
    1. Verify if recipe nutrition values seem accurate based on ingredients
    2. Validate that serving sizes are realistic for ingredient quantities
    3. Identify any significant gaps vs targets (>${Math.round(MEAL_PLAN_CONFIG.VALIDATION.calorie_tolerance * 100)}% off)
    4. Suggest specific fixes if needed

    Return JSON only:
    {
        "dailyTotalsAccurate": true/false,
        "recipeAccuracy": {"recipeName": "accurate/low/high", ...},
        "servingAccuracy": {"recipeName": "accurate/too_small/too_large", ...},
        "nutritionGaps": ["25g protein deficit", "150 calorie surplus", ...],
        "servingIssues": ["Recipe X claims 4 servings but ingredients only support 2", ...],
        "needsAdjustment": true/false,
        "adjustmentSuggestions": ["Add 6oz chicken breast to dinner for +40g protein", "Adjust Recipe Y to 2 servings based on ingredient amounts", ...]
    }
    `;
}

/**
 * Build nutrition adjustment prompt
 */
export function buildNutritionAdjustmentPrompt(context: AdjustmentPromptContext): string {
    const { validationResult, plan } = context;

    return `
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
    6. Do NOT include grocery_list - this will be regenerated automatically by the system

    ADJUSTMENT PRIORITIES:
    - Protein deficit: Add chicken, fish, eggs, Greek yogurt, beans
    - Fat deficit: Add olive oil, nuts, avocado, seeds
    - Carb surplus: Replace simple carbs with vegetables or reduce portions
    - Fiber deficit: Add berries, vegetables, whole grains

    Return the complete modified meal plan in the same JSON format with:
    - Updated recipe ingredients
    - Updated nutrition values per serving
    - List of changes made

    CRITICAL: Do NOT include grocery_list in your response - it will be regenerated automatically

    Return JSON only in this format:
    {
        "plan": { /* complete modified meal plan */ },
        "adjustmentsMade": ["Added 6oz chicken breast to Quinoa Stir-Fry", "Added 1 tbsp olive oil to salad", ...]
    }
    `;
}

/**
 * Standard system messages for AI agents
 */
export const AI_SYSTEM_MESSAGES = {
    mealPlanning: "You are a meal-planning assistant specialized in creating balanced, practical weekly meal plans with accurate nutrition tracking and comprehensive grocery lists. Always return valid JSON.",
    nutritionValidation: "You are a nutrition validation expert. Analyze meal plans for accuracy and provide specific recommendations. Always return valid JSON.",
    nutritionAdjustment: "You are a nutrition adjustment expert. Modify meal plans to meet nutrition targets while maintaining recipe coherence. Always return valid JSON.",
} as const;

/**
 * Build user request context for meal planning
 */
export function buildMealPlanUserContext(requestData: any): any {
    return {
        known_meals: requestData.knownMeals || [],
        preferences: requestData.preferences,
        week: requestData.weekStartISO,
        days_out_of_town: requestData.daysOutOfTown || [],
        meals_out: requestData.mealsOut || [],
        additional_instructions: requestData.instructions,
        selected_known_meals: requestData.selectedKnownMeals || [],
        output_format: "JSON only",
    };
}