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
    mealType: string[];
    tags: string[];
    notes: string;
    url: string;
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