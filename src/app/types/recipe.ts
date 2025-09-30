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