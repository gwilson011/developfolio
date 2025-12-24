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
import OpenAI from 'openai';
import { buildGroceryListPrompt } from './ai-prompts';
import { GroceryListJSONSchema } from '@/app/utils/schema';

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
 * Convert cooking quantity to shopping quantity (for consolidated amounts)
 * Returns conversion info without formatting or rounding (that happens later)
 */
function convertCookingToShopping(quantity: number, unit: string, name: string): {
    quantity: number;
    unit: string;
    name: string;
    converted: boolean;
} {
    const lowerName = name.toLowerCase().trim();

    // Check if this is a cooking ingredient that needs conversion
    for (const [cookingName, conversion] of Object.entries(COOKING_TO_SHOPPING_CONVERSIONS)) {
        if (lowerName.includes(cookingName)) {
            const shoppingQuantity = quantity * conversion.ratio;
            const shoppingName = conversion.shoppingName || name.replace(/cooked\s+/i, '');

            return {
                quantity: shoppingQuantity,
                unit: conversion.shoppingUnit,
                name: shoppingName,
                converted: true
            };
        }
    }

    // No conversion needed
    return { quantity, unit, name, converted: false };
}

/**
 * Generate consolidated grocery list from recipes (DETERMINISTIC - LEGACY)
 *
 * This is the legacy deterministic implementation, kept as a fallback.
 * The new LLM-powered version is generateGroceryList() below.
 *
 * FLOW (Phase 2 - Consolidate Earlier, Transform Less):
 * 1. Parse all ingredients (no conversions yet)
 * 2. Normalize names (keeps product differentiators - Phase 1)
 * 3. Group by (category + normalized name)
 * 4. Consolidate quantities within each group
 * 5. Apply cooking-to-shopping conversion ONCE on consolidated amount
 * 6. Apply smart rounding ONCE
 * 7. Normalize units
 * 8. Format
 */
export function generateGroceryListDeterministic(recipes: Record<string, RecipeData>): GroceryList {
    console.log('[generateGroceryList] PHASE 2: Starting new consolidated-first pipeline');

    // STEP 1-4: Parse, normalize, group, and consolidate BEFORE any transformations
    const consolidated: Record<string, Record<string, {
        quantity: number;
        unit: string;
        name: string;
        displayName: string; // Keep original formatting for display
        originalIngredients: string[]; // Track what went into this
    }>> = {};

    let totalIngredientsProcessed = 0;

    for (const [recipeName, recipe] of Object.entries(recipes)) {
        if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) continue;

        console.log(`[generateGroceryList] Processing recipe: "${recipeName}" with ${recipe.ingredients.length} ingredients`);

        for (const ingredient of recipe.ingredients) {
            totalIngredientsProcessed++;

            // STEP 1: Parse (no transformations)
            const parsed = parseIngredient(ingredient);

            // STEP 2: Normalize name (Phase 1 improvement - keeps important descriptors)
            const normalizedName = normalizeIngredientName(parsed.name);

            // Skip non-ingredients (like "salt and pepper to taste")
            if (!normalizedName || normalizedName.length === 0) {
                console.log(`[generateGroceryList] ⊘ Skipping non-ingredient: "${ingredient}"`);
                continue;
            }

            // STEP 3: Categorize for grouping
            const category = categorizeIngredient(ingredient);

            if (!consolidated[category]) {
                consolidated[category] = {};
            }

            // STEP 4: Consolidate quantities BEFORE conversions
            if (consolidated[category][normalizedName]) {
                const existing = consolidated[category][normalizedName];

                // Add quantities together (handles unit conversion if possible)
                const combined = addQuantities(
                    existing.quantity, existing.unit,
                    parsed.quantity, parsed.unit
                );

                consolidated[category][normalizedName] = {
                    quantity: combined.quantity,
                    unit: combined.unit,
                    name: existing.name, // Keep first name format
                    displayName: existing.displayName, // Keep first display format
                    originalIngredients: [...existing.originalIngredients, ingredient]
                };

                console.log(`[generateGroceryList] ✓ Consolidated "${ingredient}" into "${normalizedName}": ${existing.quantity} ${existing.unit} + ${parsed.quantity} ${parsed.unit} = ${combined.quantity} ${combined.unit}`);
            } else {
                consolidated[category][normalizedName] = {
                    quantity: parsed.quantity,
                    unit: parsed.unit,
                    name: parsed.name,
                    displayName: parsed.name,
                    originalIngredients: [ingredient]
                };

                console.log(`[generateGroceryList] ✓ New item "${normalizedName}": ${parsed.quantity} ${parsed.unit}`);
            }
        }
    }

    console.log(`[generateGroceryList] Processed ${totalIngredientsProcessed} ingredients into ${Object.values(consolidated).reduce((sum, cat) => sum + Object.keys(cat).length, 0)} consolidated items`);

    // STEP 5-8: Transform consolidated amounts (conversions, rounding, formatting)
    const result: GroceryList = {};

    for (const [category, items] of Object.entries(consolidated)) {
        const formattedItems: string[] = [];

        for (const [normalizedName, item] of Object.entries(items)) {
            // STEP 5: Apply cooking-to-shopping conversion ONCE on consolidated amount
            const converted = convertCookingToShopping(item.quantity, item.unit, item.name);

            if (converted.converted) {
                console.log(`[generateGroceryList] 🔄 Converted "${normalizedName}": ${item.quantity} ${item.unit} ${item.name} → ${converted.quantity} ${converted.unit} ${converted.name}`);
                console.log(`[generateGroceryList]    Original ingredients: ${item.originalIngredients.join(', ')}`);
            }

            // STEP 6: Apply smart rounding ONCE
            const smartRounded = smartRoundForShopping(converted.quantity, converted.unit, converted.name);

            // STEP 7: Normalize units (cups to tbsp, etc.)
            const normalized = normalizeUnits(smartRounded.quantity, smartRounded.unit);

            // STEP 8: Format for display
            const formatted = formatIngredient(normalized.quantity, normalized.unit, converted.name);
            formattedItems.push(formatted);

            // Validation: Flag suspicious consolidations
            if (item.originalIngredients.length > 5) {
                console.warn(`[generateGroceryList] ⚠️  Suspicious: "${normalizedName}" has ${item.originalIngredients.length} ingredients - might be over-consolidating`);
            }
        }

        if (formattedItems.length > 0) {
            result[category] = formattedItems;
        }
    }

    // Final summary
    const totalCategories = Object.keys(result).length;
    const totalItems = Object.values(result).reduce((sum, items) => sum + items.length, 0);
    console.log(`[generateGroceryList] ✅ Generated grocery list: ${totalItems} items across ${totalCategories} categories`);

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
                    const parsed = parseIngredient(ingredient);
                    const normalized = normalizeIngredientName(parsed.name);
                    if (normalized && normalized.length > 0) {
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
                const parsed = parseIngredient(item);
                const normalized = normalizeIngredientName(parsed.name);
                if (normalized && normalized.length > 0) {
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

/**
 * Generate consolidated grocery list using LLM (NEW - PRIMARY METHOD)
 *
 * This uses GPT-4o-mini to intelligently consolidate ingredients with semantic understanding.
 * Falls back to deterministic method if LLM call fails.
 *
 * Features:
 * - Consolidates similar items (chicken breast + thighs → "2 lbs chicken")
 * - Adds helpful notes ("breast for stir-fry, thighs for tacos, OR 4-5 cans")
 * - Converts cooked → raw amounts (2 cups cooked rice → 2/3 cup dry rice)
 * - Practical rounding (1.2 lbs → 1-1.5 lbs)
 * - Shopping-friendly units
 */
export async function generateGroceryList(
    recipes: Record<string, RecipeData>,
    openai: OpenAI
): Promise<GroceryList> {
    console.log('[generateGroceryList] Using LLM-powered consolidation');

    try {
        // Extract all ingredients from all recipes
        const allIngredients: string[] = [];
        for (const recipe of Object.values(recipes)) {
            if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
                allIngredients.push(...recipe.ingredients);
            }
        }

        console.log(`[generateGroceryList] Consolidating ${allIngredients.length} ingredients with LLM`);

        // Build prompt with consolidation instructions
        const prompt = buildGroceryListPrompt(allIngredients);

        // Call LLM with structured outputs
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.2,
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "grocery_list",
                    strict: false, // Dynamic keys not supported in strict mode
                    schema: GroceryListJSONSchema
                }
            },
            messages: [
                {
                    role: "system",
                    content: "You are a grocery shopping expert. Create practical, consolidated grocery lists that make shopping efficient while preserving recipe context."
                },
                { role: "user", content: prompt }
            ]
        });

        const result = JSON.parse(response.choices[0].message.content || "{}");

        console.log('[generateGroceryList] LLM consolidation complete');
        console.log('[generateGroceryList] Categories:', Object.keys(result).join(', '));

        // Log total items
        const totalItems = Object.values(result).reduce((sum: number, items) =>
            sum + ((items as string[])?.length || 0), 0
        );
        console.log(`[generateGroceryList] Generated ${totalItems} consolidated items from ${allIngredients.length} ingredients`);

        return result as GroceryList;

    } catch (error) {
        console.error('[generateGroceryList] LLM consolidation failed, falling back to deterministic method:', error);
        console.log('[generateGroceryList] Falling back to deterministic grocery list generation');
        return generateGroceryListDeterministic(recipes);
    }
}