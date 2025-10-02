import { z } from "zod";
import { MEAL_PLAN_CONFIG } from "@/config/meal-plan";

// Recipe schema
export const RecipeSchema = z.object({
    ingredients: z.array(z.string()),
    instructions: z.string(),
    servings: z.number(),
    calories_per_serving: z.number(),
    protein_per_serving: z.number(),
    carbs_per_serving: z.number(),
    fat_per_serving: z.number(),
    fiber_per_serving: z.number(),
});

// Meal schema
export const MealsSchema = z.object({
    breakfast: z.string(),
    lunch: z.string(),
    dinner: z.string(),
    snack: z.string(),
});

// Day schema with full meal structure
export const DaySchema = z.object({
    day: z.string(),
    meals: MealsSchema,
    calories_estimate: z.number().optional(),
});

// Grocery list schema
export const GrocerySchema = z.record(z.string(), z.array(z.string()));

// Complete meal plan schema
export const PlanSchema = z.object({
    week: z.string(),
    days: z.array(DaySchema).length(7),
    grocery_list: GrocerySchema.optional(), // Made optional since AI no longer generates this
    recipes: z.record(RecipeSchema),
    target_daily_calories: z.number(),
});

// Request validation schemas
export const CaloriesSchema = z.number()
    .min(MEAL_PLAN_CONFIG.CONSTRAINTS.min_daily_calories)
    .max(MEAL_PLAN_CONFIG.CONSTRAINTS.max_daily_calories);

export const MealPlanRequestSchema = z.object({
    preferences: z.any().optional(),
    weekStartISO: z.string(),
    knownMeals: z.array(z.any()).default([]),
    dailyCalories: CaloriesSchema,
    daysOutOfTown: z.array(z.boolean()).length(7).default(Array(7).fill(false)),
    mealsOut: z.array(z.object({
        breakfast: z.boolean(),
        lunch: z.boolean(),
        dinner: z.boolean(),
    })).length(7).default(Array(7).fill(null).map(() => ({
        breakfast: false,
        lunch: false,
        dinner: false
    }))),
    instructions: z.string().default(""),
    selectedKnownMeals: z.array(z.string()).default([]),
});

// Nutrition validation schema
export const NutritionTargetsSchema = z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
    fiber: z.number(),
});

export const NutritionValidationSchema = z.object({
    dailyTotalsAccurate: z.boolean(),
    recipeAccuracy: z.record(z.enum(["accurate", "low", "high"])),
    servingAccuracy: z.record(z.enum(["accurate", "too_small", "too_large"])),
    nutritionGaps: z.array(z.string()),
    servingIssues: z.array(z.string()),
    needsAdjustment: z.boolean(),
    adjustmentSuggestions: z.array(z.string()).optional(),
});

// Type exports
export type Recipe = z.infer<typeof RecipeSchema>;
export type Meals = z.infer<typeof MealsSchema>;
export type Day = z.infer<typeof DaySchema>;
export type GroceryList = z.infer<typeof GrocerySchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type MealPlanRequest = z.infer<typeof MealPlanRequestSchema>;
export type NutritionTargets = z.infer<typeof NutritionTargetsSchema>;
export type NutritionValidation = z.infer<typeof NutritionValidationSchema>;
