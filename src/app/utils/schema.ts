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
    calories_estimate: z.number(), // Required for OpenAI structured outputs
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

// JSON Schema for OpenAI Structured Outputs
// Converted from PlanSchema for use with response_format
export const MealPlanJSONSchema = {
    type: "object",
    properties: {
        week: {
            type: "string",
            description: "Week identifier in ISO format"
        },
        days: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    day: {
                        type: "string",
                        description: "Day of the week"
                    },
                    meals: {
                        type: "object",
                        properties: {
                            breakfast: { type: "string" },
                            lunch: { type: "string" },
                            dinner: { type: "string" },
                            snack: { type: "string" }
                        },
                        required: ["breakfast", "lunch", "dinner", "snack"],
                        additionalProperties: false
                    },
                    calories_estimate: {
                        type: "number",
                        description: "Estimated total calories for this day"
                    }
                },
                required: ["day", "meals", "calories_estimate"],
                additionalProperties: false
            },
            minItems: 7,
            maxItems: 7,
            description: "Array of 7 days for the weekly meal plan"
        },
        recipes: {
            type: "object",
            description: "Recipe details keyed by recipe name",
            additionalProperties: {
                type: "object",
                properties: {
                    ingredients: {
                        type: "array",
                        items: { type: "string" },
                        description: "List of ingredients with quantities"
                    },
                    instructions: {
                        type: "string",
                        description: "Cooking instructions"
                    },
                    servings: {
                        type: "number",
                        description: "Number of servings this recipe makes"
                    },
                    calories_per_serving: {
                        type: "number",
                        description: "Calories per serving"
                    },
                    protein_per_serving: {
                        type: "number",
                        description: "Protein in grams per serving"
                    },
                    carbs_per_serving: {
                        type: "number",
                        description: "Carbohydrates in grams per serving"
                    },
                    fat_per_serving: {
                        type: "number",
                        description: "Fat in grams per serving"
                    },
                    fiber_per_serving: {
                        type: "number",
                        description: "Fiber in grams per serving"
                    }
                },
                required: [
                    "ingredients",
                    "instructions",
                    "servings",
                    "calories_per_serving",
                    "protein_per_serving",
                    "carbs_per_serving",
                    "fat_per_serving",
                    "fiber_per_serving"
                ],
                additionalProperties: false
            }
        },
        target_daily_calories: {
            type: "number",
            description: "Target daily calorie intake"
        }
    },
    required: ["week", "days", "recipes", "target_daily_calories"],
    additionalProperties: false
} as const;

// JSON Schema for LLM-generated Grocery Lists
export const GroceryListJSONSchema = {
    type: "object",
    properties: {
        produce: {
            type: "array",
            items: { type: "string" },
            description: "Fruits and vegetables"
        },
        proteins: {
            type: "array",
            items: { type: "string" },
            description: "Meats, fish, eggs, tofu, beans"
        },
        dairy: {
            type: "array",
            items: { type: "string" },
            description: "Milk, cheese, yogurt, butter"
        },
        grains: {
            type: "array",
            items: { type: "string" },
            description: "Rice, pasta, bread, cereals"
        },
        condiments: {
            type: "array",
            items: { type: "string" },
            description: "Oils, sauces, spices, seasonings"
        },
        nuts: {
            type: "array",
            items: { type: "string" },
            description: "Nuts and seeds"
        },
        other: {
            type: "array",
            items: { type: "string" },
            description: "Items that don't fit other categories"
        }
    },
    required: ["produce", "proteins", "dairy", "grains", "condiments"],
    additionalProperties: true
} as const;
