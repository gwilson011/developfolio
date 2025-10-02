// Consolidated grocery list operations

import {
    parseIngredient,
    normalizeIngredientName,
    addQuantities,
    normalizeUnits,
    formatIngredient,
    smartRoundForShopping
} from './ingredients';
import { INGREDIENT_CATEGORIES } from '@/config/meal-plan';
import { RecipeData } from '@/app/types/recipe';

/**
 * Conversion map from cooking ingredients to shopping ingredients
 */
const COOKING_TO_SHOPPING_CONVERSIONS: { [key: string]: { ratio: number; shoppingUnit: string; shoppingName?: string } } = {
    // Rice conversions: 1 cup dry rice → 3 cups cooked rice
    'cooked rice': { ratio: 1/3, shoppingUnit: 'cup', shoppingName: 'rice' },
    'cooked brown rice': { ratio: 1/3, shoppingUnit: 'cup', shoppingName: 'brown rice' },
    'cooked white rice': { ratio: 1/3, shoppingUnit: 'cup', shoppingName: 'white rice' },

    // Quinoa conversions: 1 cup dry quinoa → 3 cups cooked quinoa
    'cooked quinoa': { ratio: 1/3, shoppingUnit: 'cup', shoppingName: 'quinoa' },

    // Pasta conversions: 1 cup dry pasta → 2 cups cooked pasta
    'cooked pasta': { ratio: 1/2, shoppingUnit: 'cup', shoppingName: 'pasta' },
    'cooked spaghetti': { ratio: 1/2, shoppingUnit: 'cup', shoppingName: 'spaghetti' },
    'cooked penne': { ratio: 1/2, shoppingUnit: 'cup', shoppingName: 'penne pasta' },

    // Bean conversions: 1 cup dry beans → 3 cups cooked beans
    'cooked black beans': { ratio: 1/3, shoppingUnit: 'cup', shoppingName: 'black beans' },
    'cooked chickpeas': { ratio: 1/3, shoppingUnit: 'cup', shoppingName: 'chickpeas' },
    'cooked lentils': { ratio: 1/3, shoppingUnit: 'cup', shoppingName: 'lentils' },
};

export interface GroceryList {
    [category: string]: string[];
}

/**
 * Convert cooking ingredient to shopping ingredient
 */
function convertToShoppingIngredient(ingredient: string): { ingredient: string; converted: boolean } {
    const parsed = parseIngredient(ingredient);
    const lowerName = parsed.name.toLowerCase().trim();

    // Check if this is a cooking ingredient that needs conversion
    for (const [cookingName, conversion] of Object.entries(COOKING_TO_SHOPPING_CONVERSIONS)) {
        if (lowerName.includes(cookingName)) {
            const shoppingQuantity = parsed.quantity * conversion.ratio;
            const shoppingName = conversion.shoppingName || parsed.name.replace(/cooked\s+/i, '');

            // Apply smart rounding for shopping
            const smartRounded = smartRoundForShopping(shoppingQuantity, conversion.shoppingUnit, shoppingName);

            const shoppingIngredient = formatIngredient(
                smartRounded.quantity,
                smartRounded.unit,
                shoppingName
            );

            return { ingredient: shoppingIngredient, converted: true };
        }
    }

    // No conversion needed, but still apply smart rounding
    const smartRounded = smartRoundForShopping(parsed.quantity, parsed.unit, parsed.name);
    const shoppingIngredient = formatIngredient(
        smartRounded.quantity,
        smartRounded.unit,
        parsed.name
    );

    return { ingredient: shoppingIngredient, converted: false };
}

/**
 * Generate consolidated grocery list from recipes
 */
export function generateGroceryList(recipes: Record<string, RecipeData>): GroceryList {
    const consolidated: Record<string, Record<string, { quantity: number; unit: string; name: string }>> = {};

    // First pass: collect all ingredients by category
    for (const [, recipe] of Object.entries(recipes)) {
        if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) continue;

        for (const ingredient of recipe.ingredients) {
            // Convert cooking ingredient to shopping ingredient
            const { ingredient: shoppingIngredient, converted } = convertToShoppingIngredient(ingredient);

            const category = categorizeIngredient(shoppingIngredient);

            if (!consolidated[category]) {
                consolidated[category] = {};
            }

            const parsed = parseIngredient(shoppingIngredient);
            const normalizedName = normalizeIngredientName(parsed.name);

            // Log conversions for debugging
            if (converted) {
                console.log(`[generateGroceryList] Converted: "${ingredient}" → "${shoppingIngredient}"`);
            }

            if (consolidated[category][normalizedName]) {
                // Add quantities together
                const existing = consolidated[category][normalizedName];
                const combined = addQuantities(
                    existing.quantity, existing.unit,
                    parsed.quantity, parsed.unit
                );

                consolidated[category][normalizedName] = {
                    quantity: combined.quantity,
                    unit: combined.unit,
                    name: existing.name // Keep original name format
                };
            } else {
                consolidated[category][normalizedName] = {
                    quantity: parsed.quantity,
                    unit: parsed.unit,
                    name: parsed.name
                };
            }
        }
    }

    // Second pass: format as strings with normalized units
    const result: GroceryList = {};
    for (const [category, items] of Object.entries(consolidated)) {
        const formattedItems = Object.values(items).map((item) => {
            const normalized = normalizeUnits(item.quantity, item.unit);
            return formatIngredient(normalized.quantity, normalized.unit, item.name);
        });

        if (formattedItems.length > 0) {
            result[category] = formattedItems;
        }
    }

    return result;
}

/**
 * Categorize ingredient for grocery organization
 */
function categorizeIngredient(ingredient: string): string {
    const ing = ingredient.toLowerCase();

    // Check each category from config
    for (const [category, keywords] of Object.entries(INGREDIENT_CATEGORIES)) {
        if (keywords.some(keyword => ing.includes(keyword))) {
            return category;
        }
    }

    return "other";
}

/**
 * Validate that grocery list contains all recipe ingredients
 */
export function validateGroceryIngredients(recipes: Record<string, RecipeData> | undefined, groceryList: GroceryList | undefined): {
    allRecipeIngredients: string[];
    groceryIngredients: string[];
    missingIngredients: string[];
} {
    // Extract all recipe ingredients
    const allRecipeIngredients = new Set<string>();
    if (recipes && typeof recipes === 'object') {
        Object.values(recipes).forEach((recipe) => {
            if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
                recipe.ingredients.forEach((ingredient: string) => {
                    const normalized = normalizeIngredientName(ingredient);
                    if (normalized) {
                        allRecipeIngredients.add(normalized);
                    }
                });
            }
        });
    }

    // Extract all grocery list ingredients
    const groceryIngredients = new Set<string>();
    if (groceryList && typeof groceryList === 'object') {
        Object.values(groceryList).forEach((items: string[]) => {
            items.forEach((item: string) => {
                const normalized = normalizeIngredientName(item);
                if (normalized) {
                    groceryIngredients.add(normalized);
                }
            });
        });
    }

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