// Utility functions for parsing and standardizing ingredients

export interface ParsedIngredient {
    original: string;
    quantity?: number;
    unit?: string;
    ingredient: string;
    notes?: string;
}

// Common ingredient units and their standardized forms
const UNIT_MAPPING: Record<string, string> = {
    // Volume
    'tsp': 'teaspoon',
    'teaspoons': 'teaspoon',
    'tbsp': 'tablespoon',
    'tablespoons': 'tablespoon',
    'cup': 'cup',
    'cups': 'cup',
    'ml': 'ml',
    'l': 'liter',
    'liter': 'liter',
    'liters': 'liter',
    'fl oz': 'fl oz',
    'fluid ounce': 'fl oz',
    'fluid ounces': 'fl oz',
    'pint': 'pint',
    'pints': 'pint',
    'qt': 'quart',
    'quart': 'quart',
    'quarts': 'quart',
    'gal': 'gallon',
    'gallon': 'gallon',
    'gallons': 'gallon',

    // Weight
    'oz': 'oz',
    'ounce': 'oz',
    'ounces': 'oz',
    'lb': 'lb',
    'pound': 'lb',
    'pounds': 'lb',
    'g': 'g',
    'gram': 'g',
    'grams': 'g',
    'kg': 'kg',
    'kilogram': 'kg',
    'kilograms': 'kg',

    // Count
    'piece': 'piece',
    'pieces': 'piece',
    'slice': 'slice',
    'slices': 'slice',
    'clove': 'clove',
    'cloves': 'clove',
    'can': 'can',
    'cans': 'can',
    'bottle': 'bottle',
    'bottles': 'bottle',
    'jar': 'jar',
    'jars': 'jar',
    'package': 'package',
    'packages': 'package',
    'bag': 'bag',
    'bags': 'bag',
    'box': 'box',
    'boxes': 'box',
    'bunch': 'bunch',
    'bunches': 'bunch',
};

// Regex patterns for parsing ingredients
const QUANTITY_PATTERNS = [
    // Fractions: 1/2, 2/3, etc.
    /^(\d+)\/(\d+)/,
    // Mixed numbers: 1 1/2, 2 3/4, etc.
    /^(\d+)\s+(\d+)\/(\d+)/,
    // Decimals: 1.5, 2.25, etc.
    /^(\d+\.?\d*)/,
    // Ranges: 2-3, 1-2, etc.
    /^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/,
];

const UNIT_PATTERN = /^(?:of\s+)?([a-zA-Z\s\.]+?)(?:\s|$)/;

export function parseIngredient(ingredientText: string): ParsedIngredient {
    const original = ingredientText.trim();
    let remaining = original.toLowerCase();

    let quantity: number | undefined;
    let unit: string | undefined;
    let ingredient: string;
    let notes: string | undefined;

    // Extract notes in parentheses
    const notesMatch = remaining.match(/\(([^)]+)\)/);
    if (notesMatch) {
        notes = notesMatch[1];
        remaining = remaining.replace(/\s*\([^)]+\)\s*/g, ' ').trim();
    }

    // Try to parse quantity
    for (const pattern of QUANTITY_PATTERNS) {
        const match = remaining.match(pattern);
        if (match) {
            if (pattern.source.includes('/')) {
                if (match.length === 3) {
                    // Simple fraction: 1/2
                    quantity = parseInt(match[1]) / parseInt(match[2]);
                } else if (match.length === 4) {
                    // Mixed number: 1 1/2
                    quantity = parseInt(match[1]) + (parseInt(match[2]) / parseInt(match[3]));
                }
            } else if (pattern.source.includes('-')) {
                // Range: take the average
                quantity = (parseFloat(match[1]) + parseFloat(match[2])) / 2;
            } else {
                // Simple decimal
                quantity = parseFloat(match[1]);
            }
            remaining = remaining.replace(pattern, '').trim();
            break;
        }
    }

    // Try to parse unit
    const unitMatch = remaining.match(UNIT_PATTERN);
    if (unitMatch) {
        const rawUnit = unitMatch[1].trim().replace(/\.$/, ''); // Remove trailing period
        unit = UNIT_MAPPING[rawUnit] || rawUnit;
        remaining = remaining.replace(unitMatch[0], '').trim();
    }

    // Clean up the remaining text as the ingredient name
    ingredient = remaining
        .replace(/^(of\s+)?/, '') // Remove leading "of"
        .replace(/,$/, '') // Remove trailing comma
        .trim();

    return {
        original,
        quantity,
        unit,
        ingredient,
        notes
    };
}

export function standardizeIngredients(ingredients: string[]): string[] {
    return ingredients.map(ingredient => {
        const parsed = parseIngredient(ingredient);

        // Reconstruct with standardized format
        let result = '';

        if (parsed.quantity) {
            // Format quantity nicely
            if (parsed.quantity % 1 === 0) {
                result += parsed.quantity.toString();
            } else {
                // Convert decimal to fraction if it's a common fraction
                const commonFractions: Record<number, string> = {
                    0.125: '1/8',
                    0.25: '1/4',
                    0.333: '1/3',
                    0.5: '1/2',
                    0.667: '2/3',
                    0.75: '3/4',
                };

                const rounded = Math.round(parsed.quantity * 1000) / 1000;
                const fraction = commonFractions[rounded];

                if (fraction) {
                    result += fraction;
                } else {
                    result += parsed.quantity.toString();
                }
            }
        }

        if (parsed.unit) {
            result += (result ? ' ' : '') + parsed.unit;
        }

        if (parsed.ingredient) {
            result += (result ? ' ' : '') + parsed.ingredient;
        }

        if (parsed.notes) {
            result += ` (${parsed.notes})`;
        }

        return result || parsed.original;
    });
}

export function categorizeIngredients(ingredients: string[]): Record<string, string[]> {
    const categories: Record<string, string[]> = {
        proteins: [],
        vegetables: [],
        fruits: [],
        grains: [],
        dairy: [],
        condiments: [],
        spices: [],
        other: []
    };

    const categoryKeywords = {
        proteins: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'tofu', 'eggs', 'beans', 'lentils', 'chickpeas', 'turkey', 'shrimp', 'meat'],
        vegetables: ['onion', 'garlic', 'tomato', 'pepper', 'carrot', 'celery', 'spinach', 'broccoli', 'lettuce', 'cucumber', 'potato', 'mushroom', 'zucchini', 'avocado'],
        fruits: ['apple', 'banana', 'orange', 'lemon', 'lime', 'berries', 'strawberries', 'blueberries', 'grapes', 'mango', 'pineapple'],
        grains: ['rice', 'pasta', 'bread', 'flour', 'quinoa', 'oats', 'barley', 'noodles', 'cereal'],
        dairy: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream'],
        condiments: ['oil', 'vinegar', 'sauce', 'dressing', 'mayo', 'mustard', 'ketchup', 'honey', 'syrup'],
        spices: ['salt', 'pepper', 'paprika', 'cumin', 'oregano', 'basil', 'thyme', 'rosemary', 'cinnamon', 'vanilla']
    };

    for (const ingredient of ingredients) {
        const lowerIngredient = ingredient.toLowerCase();
        let categorized = false;

        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(keyword => lowerIngredient.includes(keyword))) {
                categories[category].push(ingredient);
                categorized = true;
                break;
            }
        }

        if (!categorized) {
            categories.other.push(ingredient);
        }
    }

    // Remove empty categories
    return Object.fromEntries(
        Object.entries(categories).filter(([_, items]) => items.length > 0)
    );
}