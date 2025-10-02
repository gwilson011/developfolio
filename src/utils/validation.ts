// Centralized validation utilities for meal planning system

import { z } from 'zod';
import {
    PlanSchema,
    MealPlanRequestSchema,
    CaloriesSchema,
    NutritionValidationSchema,
    NutritionTargetsSchema,
    type Plan,
    type MealPlanRequest,
    type NutritionValidation,
    type NutritionTargets
} from '@/app/utils/schema';
import { MEAL_PLAN_CONFIG } from '@/config/meal-plan';

export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    issues?: z.ZodIssue[];
}

/**
 * Validate a complete meal plan
 */
export function validateMealPlan(data: unknown): ValidationResult<Plan> {
    const result = PlanSchema.safeParse(data);

    if (result.success) {
        return {
            success: true,
            data: result.data
        };
    }

    return {
        success: false,
        error: "Invalid meal plan structure",
        issues: result.error.issues
    };
}

/**
 * Validate meal plan request parameters
 */
export function validateMealPlanRequest(data: unknown): ValidationResult<MealPlanRequest> {
    const result = MealPlanRequestSchema.safeParse(data);

    if (result.success) {
        return {
            success: true,
            data: result.data
        };
    }

    return {
        success: false,
        error: "Invalid request parameters",
        issues: result.error.issues
    };
}

/**
 * Validate daily calories value
 */
export function validateCalories(calories: unknown): ValidationResult<number> {
    const result = CaloriesSchema.safeParse(calories);

    if (result.success) {
        return {
            success: true,
            data: result.data
        };
    }

    return {
        success: false,
        error: `Daily calories must be between ${MEAL_PLAN_CONFIG.CONSTRAINTS.min_daily_calories} and ${MEAL_PLAN_CONFIG.CONSTRAINTS.max_daily_calories}`,
        issues: result.error.issues
    };
}

/**
 * Validate nutrition validation response from AI
 */
export function validateNutritionValidation(data: unknown): ValidationResult<NutritionValidation> {
    const result = NutritionValidationSchema.safeParse(data);

    if (result.success) {
        return {
            success: true,
            data: result.data
        };
    }

    return {
        success: false,
        error: "Invalid nutrition validation format",
        issues: result.error.issues
    };
}

/**
 * Validate nutrition targets
 */
export function validateNutritionTargets(data: unknown): ValidationResult<NutritionTargets> {
    const result = NutritionTargetsSchema.safeParse(data);

    if (result.success) {
        return {
            success: true,
            data: result.data
        };
    }

    return {
        success: false,
        error: "Invalid nutrition targets",
        issues: result.error.issues
    };
}

/**
 * Check if a meal plan meets nutrition tolerance thresholds
 */
export function checkNutritionTolerance(
    actual: NutritionTargets,
    targets: NutritionTargets
): {
    withinTolerance: boolean;
    gaps: string[];
} {
    const gaps: string[] = [];
    const tolerance = MEAL_PLAN_CONFIG.VALIDATION;

    // Check calories
    const caloriesDiff = Math.abs(actual.calories - targets.calories) / targets.calories;
    if (caloriesDiff > tolerance.calorie_tolerance) {
        const direction = actual.calories > targets.calories ? "surplus" : "deficit";
        gaps.push(`${Math.round(Math.abs(actual.calories - targets.calories))} calorie ${direction}`);
    }

    // Check protein
    const proteinDiff = Math.abs(actual.protein - targets.protein) / targets.protein;
    if (proteinDiff > tolerance.protein_tolerance) {
        const direction = actual.protein > targets.protein ? "surplus" : "deficit";
        gaps.push(`${Math.round(Math.abs(actual.protein - targets.protein))}g protein ${direction}`);
    }

    // Check other macros (using calorie tolerance as default)
    const carbsDiff = Math.abs(actual.carbs - targets.carbs) / targets.carbs;
    if (carbsDiff > tolerance.calorie_tolerance) {
        const direction = actual.carbs > targets.carbs ? "surplus" : "deficit";
        gaps.push(`${Math.round(Math.abs(actual.carbs - targets.carbs))}g carbs ${direction}`);
    }

    const fatDiff = Math.abs(actual.fat - targets.fat) / targets.fat;
    if (fatDiff > tolerance.calorie_tolerance) {
        const direction = actual.fat > targets.fat ? "surplus" : "deficit";
        gaps.push(`${Math.round(Math.abs(actual.fat - targets.fat))}g fat ${direction}`);
    }

    const fiberDiff = Math.abs(actual.fiber - targets.fiber) / targets.fiber;
    if (fiberDiff > tolerance.calorie_tolerance) {
        const direction = actual.fiber > targets.fiber ? "surplus" : "deficit";
        gaps.push(`${Math.round(Math.abs(actual.fiber - targets.fiber))}g fiber ${direction}`);
    }

    return {
        withinTolerance: gaps.length === 0,
        gaps
    };
}

/**
 * Validate serving size reasonableness
 */
export function validateServingSize(
    claimedServings: number,
    ingredients: string[]
): {
    reasonable: boolean;
    suggestedServings?: number;
    issue?: string;
} {
    // Basic heuristic: count substantial ingredients
    const substantialIngredients = ingredients.filter(ingredient => {
        const lower = ingredient.toLowerCase();
        return !lower.includes('salt') &&
               !lower.includes('pepper') &&
               !lower.includes('spice') &&
               !lower.includes('tsp') &&
               !lower.includes('tbsp') &&
               !lower.includes('teaspoon') &&
               !lower.includes('tablespoon');
    }).length;

    const tolerance = MEAL_PLAN_CONFIG.VALIDATION.serving_size_tolerance;
    const minReasonable = Math.max(1, Math.floor(substantialIngredients * (1 - tolerance)));
    const maxReasonable = Math.ceil(substantialIngredients * (1 + tolerance));

    if (claimedServings < minReasonable) {
        return {
            reasonable: false,
            suggestedServings: minReasonable,
            issue: "too_large"
        };
    }

    if (claimedServings > maxReasonable) {
        return {
            reasonable: false,
            suggestedServings: maxReasonable,
            issue: "too_small"
        };
    }

    return {
        reasonable: true
    };
}

/**
 * Create validation error response
 */
export function createValidationError(
    context: string,
    issues: z.ZodIssue[],
    preview?: string
): {
    ok: false;
    error: string;
    context: string;
    zodIssues: z.ZodIssue[];
    preview?: string;
} {
    return {
        ok: false,
        error: "Validation failed",
        context,
        zodIssues: issues,
        ...(preview && { preview })
    };
}

/**
 * Validate environment variables required for meal planning
 */
export function validateMealPlanEnvironment(): {
    valid: boolean;
    missing: string[];
} {
    const required = [
        'OPENAI_API_KEY',
        'NOTION_TOKEN',
        'NOTION_MEALS_DB_ID'
    ];

    const missing = required.filter(varName => !process.env[varName]);

    return {
        valid: missing.length === 0,
        missing
    };
}