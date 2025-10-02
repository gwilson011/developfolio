// Instagram extracted data types
export interface InstagramData {
    url: string;
    caption: string;
    images: string[];
    author: string;
    timestamp: string;
    comments: string[];
}

// Raw recipe data from AI parsing
export interface ParsedRecipeData {
    name: string;
    ingredients: string[];
    instructions: string;
    servings: number;
    estimatedCalories: number;
    confidence: number; // 0-1 confidence score for AI parsing
    mealTypes: string[]; // breakfast, lunch, dinner, snack, dessert
    tags: string[];
    notes?: string; // Additional notes from comments or AI analysis
}

// Final recipe data ready for Notion
export interface RecipeForNotion {
    name: string;
    ingredients: string;
    instructions: string;
    servings: number;
    caloriesPerServing: number;
    proteinPerServing?: number;
    carbsPerServing?: number;
    fatPerServing?: number;
    fiberPerServing?: number;
    mealType: string[];
    tags: string[];
    notes: string;
    url?: string;
    approved: boolean;
}

// API response types
export interface InstagramExtractResponse {
    ok: boolean;
    data?: InstagramData;
    error?: string;
}

export interface RecipeParseResponse {
    ok: boolean;
    recipe?: ParsedRecipeData;
    error?: string;
}

export interface RecipeSaveResponse {
    ok: boolean;
    id?: string;
    error?: string;
}

// Notion API types
export interface NotionPage {
    id: string;
    parent?: {
        database_id?: string;
    };
    properties: {
        Name?: {
            title?: Array<{
                text?: {
                    content?: string;
                };
            }>;
        };
        Ingredients?: {
            rich_text?: Array<{
                text?: {
                    content?: string;
                };
            }>;
        };
        Notes?: {
            rich_text?: Array<{
                text?: {
                    content?: string;
                };
            }>;
        };
        "Calories per Serving"?: {
            number?: number;
        };
        Servings?: {
            number?: number;
        };
        "Protein per Serving"?: {
            number?: number;
        };
        "Carbs per Serving"?: {
            number?: number;
        };
        "Fat per Serving"?: {
            number?: number;
        };
        "Fiber per Serving"?: {
            number?: number;
        };
        "Meal Type"?: {
            multi_select?: Array<{
                name: string;
            }>;
        };
        Tags?: {
            multi_select?: Array<{
                name: string;
            }>;
        };
        [key: string]: unknown;
    };
}

export interface MealData {
    name: string;
    ingredients: string[];
    instructions: string;
    calories: number;
    servings: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    mealType: string[];
    tags: string[];
}

// Meal Plan Types
export interface DayMeal {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
    snack?: string;
    [key: string]: string | undefined;
}

export interface DayPlan {
    day: string;
    meals: DayMeal;
    calories_estimate?: number;
}

export interface GroceryList {
    [category: string]: string[];
}

export interface MealPlan {
    week: string;
    target_daily_calories: number;
    days: DayPlan[];
    grocery_list: GroceryList;
    recipes?: Record<string, RecipeData>;
}

export interface RecipeData {
    ingredients: string[];
    instructions: string;
    servings: number;
    calories_per_serving: number;
    protein_per_serving: number;
    carbs_per_serving: number;
    fat_per_serving: number;
    fiber_per_serving: number;
}

// Notion Plan Page Type
export interface NotionPlanPage {
    id: string;
    parent?: {
        database_id?: string;
    };
    properties: {
        Name?: {
            title?: Array<{
                text?: {
                    content?: string;
                };
            }>;
        };
        "Week of"?: {
            date?: {
                start?: string;
            };
        };
        "Daily Calorie Target"?: {
            number?: number;
        };
        "Grocery List"?: {
            rich_text?: Array<{
                text?: {
                    content?: string;
                };
            }>;
        };
        Monday?: {
            rich_text?: Array<{
                text?: {
                    content?: string;
                };
            }>;
        };
        Tuesday?: {
            rich_text?: Array<{
                text?: {
                    content?: string;
                };
            }>;
        };
        Wednesday?: {
            rich_text?: Array<{
                text?: {
                    content?: string;
                };
            }>;
        };
        Thursday?: {
            rich_text?: Array<{
                text?: {
                    content?: string;
                };
            }>;
        };
        Friday?: {
            rich_text?: Array<{
                text?: {
                    content?: string;
                };
            }>;
        };
        Saturday?: {
            rich_text?: Array<{
                text?: {
                    content?: string;
                };
            }>;
        };
        Sunday?: {
            rich_text?: Array<{
                text?: {
                    content?: string;
                };
            }>;
        };
        [key: string]: unknown;
    };
}

// Generic API Response Type
export interface APIResponse<T = unknown> {
    ok: boolean;
    data?: T;
    error?: string;
}

// Plan API Response Types
export interface PlanSummary {
    name: string;
    week: string;
    dailyCalories: number;
    ingredientCount: number;
    uniqueMealCount: number;
}

export interface PlanGetResponse extends APIResponse<MealPlan> {
    plan?: MealPlan;
    plans?: PlanSummary[];
}

// Nutrition Analysis Types
export interface NutritionTotals {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
}

export interface NutritionValidation {
    needsAdjustment: boolean;
    nutritionGaps?: string[];
    adjustmentSuggestions?: string[];
    error?: string;
}

export interface NutritionValidationResult {
    calculatedTotals: NutritionTotals;
    validation: NutritionValidation;
}

export interface NutritionAdjustmentResult {
    success: boolean;
    plan?: Partial<MealPlan>;
    adjustmentsMade?: string[];
    error?: string;
    details?: unknown;
}