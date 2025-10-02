// Consolidated ingredient parsing and utility functions

export interface ParsedIngredient {
    quantity: number;
    unit: string;
    name: string;
}

export interface NormalizedQuantity {
    quantity: number;
    unit: string;
}

import { VOLUME_UNITS, WEIGHT_UNITS } from '@/config/meal-plan';

/**
 * Comprehensive ingredient parser that handles quantities, units, and names
 */
export function parseIngredient(ingredient: string): ParsedIngredient {
    // Enhanced patterns to catch various quantity formats
    // Order matters: more specific patterns first
    const patterns = [
        // "1 1/2 cups flour" (with unit)
        /^(\d+\s+\d+\/\d+)\s*([a-zA-Z]+)\s+(.+)$/,
        // "1 1/2 bananas" (without unit)
        /^(\d+\s+\d+\/\d+)\s+(.+)$/,
        // "2 cups quinoa", "1.5 lbs chicken"
        /^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+(.+)$/,
        // "1/2 cup honey", "3/4 tsp salt"
        /^(\d+\/\d+)\s*([a-zA-Z]+)\s+(.+)$/,
        // "0.13 cup honey"
        /^(0\.\d+)\s*([a-zA-Z]+)\s+(.+)$/,
        // "1/2 banana", "3/4 apple" (without unit)
        /^(\d+\/\d+)\s+(.+)$/,
        // "1 banana", "2 apples" (without unit)
        /^(\d+(?:\.\d+)?)\s+(.+)$/,
    ];

    for (const pattern of patterns) {
        const match = ingredient.match(pattern);
        if (match) {
            const quantity = parseQuantityString(match[1]);

            // Check if this pattern has a unit (3 groups) or no unit (2 groups)
            if (match.length === 4) {
                // Pattern with unit: [full, quantity, unit, name]
                const [, , unit, name] = match;
                return { quantity, unit: unit.toLowerCase(), name: name.trim() };
            } else {
                // Pattern without unit: [full, quantity, name]
                const [, , name] = match;
                return { quantity, unit: "", name: name.trim() };
            }
        }
    }

    // No quantity found, treat as quantity 1 with no unit
    return { quantity: 1, unit: "", name: ingredient.trim() };
}

/**
 * Parse quantity strings including fractions and mixed numbers
 */
export function parseQuantityString(quantityStr: string): number {
    quantityStr = quantityStr.trim();

    if (quantityStr.includes('/')) {
        const parts = quantityStr.split(' ');
        if (parts.length === 2) {
            // Mixed number like "1 1/2"
            const whole = parseInt(parts[0]);
            const [num, den] = parts[1].split('/').map(Number);
            return whole + (num / den);
        } else {
            // Simple fraction like "1/2"
            const [num, den] = quantityStr.split('/').map(Number);
            return num / den;
        }
    }

    return parseFloat(quantityStr);
}

/**
 * Normalize ingredient name for comparison and grouping
 */
export function normalizeIngredientName(name: string): string {
    return name
        .toLowerCase()
        .trim()
        // Remove descriptive words that don't affect shopping
        .replace(/\b(fresh|organic|extra virgin|low fat|whole|diced|chopped|sliced|minced|crushed|ground)\b/g, '')
        // Remove parenthetical descriptions
        .replace(/\([^)]*\)/g, '')
        // Normalize plurals
        .replace(/s$/, '')
        // Remove quantities if they slipped through (including fractions)
        .replace(/^\d+(\.\d+)?(\s+\d+\/\d+|\s*\/\d+)?\s*(cups?|tbsp|tsp|lbs?|oz|cloves?|slices?|pieces?|medium|large|small|bunch|bag|can|bottle)?\s*/i, '')
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Add two quantities together, converting units if possible
 */
export function addQuantities(qty1: number, unit1: string, qty2: number, unit2: string): NormalizedQuantity {
    const base1 = convertToBaseUnit(qty1, unit1);
    const base2 = convertToBaseUnit(qty2, unit2);

    if (base1.unit === base2.unit) {
        return {
            quantity: base1.quantity + base2.quantity,
            unit: base1.unit
        };
    }

    // If units can't be converted, use the more practical unit
    const preferredUnit = getPreferredUnit(unit1, unit2);
    return {
        quantity: qty1 + qty2, // Simple addition for incompatible units
        unit: preferredUnit
    };
}

/**
 * Convert quantity to base unit (cups for volume, lbs for weight)
 */
function convertToBaseUnit(quantity: number, unit: string): NormalizedQuantity {
    const unitLower = unit.toLowerCase();

    if (VOLUME_UNITS[unitLower]) {
        return { quantity: quantity * VOLUME_UNITS[unitLower], unit: 'cup' };
    } else if (WEIGHT_UNITS[unitLower]) {
        return { quantity: quantity * WEIGHT_UNITS[unitLower], unit: 'lb' };
    }

    // Return as-is if no conversion available
    return { quantity, unit };
}

/**
 * Choose the more practical unit for grocery shopping
 */
function getPreferredUnit(unit1: string, unit2: string): string {
    const volumePreference = ['gallon', 'quart', 'cup', 'tbsp', 'tsp'];
    const weightPreference = ['lb', 'oz', 'g'];

    // Check volume units first
    for (const preferred of volumePreference) {
        if (unit1.includes(preferred) || unit2.includes(preferred)) {
            return preferred;
        }
    }

    // Check weight units
    for (const preferred of weightPreference) {
        if (unit1.includes(preferred) || unit2.includes(preferred)) {
            return preferred;
        }
    }

    return unit1; // Default to first unit
}

/**
 * Normalize awkward decimals to practical units
 */
export function normalizeUnits(quantity: number, unit: string): NormalizedQuantity {
    const unitLower = unit.toLowerCase();

    // Convert small cups to tablespoons
    if (unitLower === 'cup' && quantity < 0.25) {
        return { quantity: Math.round(quantity * 16 * 4) / 4, unit: 'tbsp' };
    }

    // Round to common fractions
    if (unitLower === 'cup' && quantity < 1) {
        if (Math.abs(quantity - 0.25) < 0.02) return { quantity: 0.25, unit: 'cup' };
        if (Math.abs(quantity - 0.33) < 0.02) return { quantity: 1/3, unit: 'cup' };
        if (Math.abs(quantity - 0.5) < 0.02) return { quantity: 0.5, unit: 'cup' };
        if (Math.abs(quantity - 0.67) < 0.02) return { quantity: 2/3, unit: 'cup' };
        if (Math.abs(quantity - 0.75) < 0.02) return { quantity: 0.75, unit: 'cup' };
    }

    // Round to reasonable precision
    let roundedQuantity = Math.round(quantity * 100) / 100;
    if (Math.abs(roundedQuantity - Math.round(roundedQuantity)) < 0.01) {
        roundedQuantity = Math.round(roundedQuantity);
    }

    return { quantity: roundedQuantity, unit };
}

/**
 * Format ingredient with proper quantity and unit pluralization
 */
export function formatIngredient(quantity: number, unit: string, name: string): string {
    let quantityStr: string;

    // Format quantity as fractions when appropriate
    if (quantity % 1 === 0) {
        quantityStr = quantity.toString();
    } else {
        // Common fractions
        if (Math.abs(quantity - 0.25) < 0.01) quantityStr = "1/4";
        else if (Math.abs(quantity - 0.33) < 0.02) quantityStr = "1/3";
        else if (Math.abs(quantity - 0.5) < 0.01) quantityStr = "1/2";
        else if (Math.abs(quantity - 0.67) < 0.02) quantityStr = "2/3";
        else if (Math.abs(quantity - 0.75) < 0.01) quantityStr = "3/4";
        else quantityStr = quantity.toFixed(2).replace(/\.?0+$/, '');
    }

    // Skip unit display for empty or "item" units
    if (!unit || unit === "item" || unit === "items") {
        return `${quantityStr} ${name}`;
    }

    // Handle unit pluralization
    const unitStr = quantity === 1 ?
        unit.replace(/s$/, '') :
        (unit.endsWith('s') ? unit : unit + 's');

    return `${quantityStr} ${unitStr} ${name}`;
}

/**
 * Apply smart rounding for grocery shopping quantities
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function smartRoundForShopping(quantity: number, unit: string, _name: string): NormalizedQuantity {
    const lowerUnit = unit.toLowerCase();

    // For discrete countable items (no unit or "item" unit), round up to whole numbers
    if (!unit || unit === "item" || unit === "items") {
        // Always round up for countable items like bananas, apples, etc.
        return { quantity: Math.ceil(quantity), unit };
    }

    // For small quantities that would be awkward to shop for, round up
    if (quantity < 0.1) {
        return { quantity: 0.25, unit }; // Minimum practical purchase
    }

    // For volume measurements, round to practical shopping fractions
    if (['cup', 'cups', 'tbsp', 'tsp'].includes(lowerUnit)) {
        if (quantity < 0.25) return { quantity: 0.25, unit };
        if (quantity < 0.5) return { quantity: 0.5, unit };
        if (quantity < 1) return { quantity: 1, unit };
        // Round larger quantities to nearest 0.25
        return { quantity: Math.ceil(quantity * 4) / 4, unit };
    }

    // For weight measurements, round up to practical shopping increments
    if (['lb', 'lbs', 'oz'].includes(lowerUnit)) {
        if (quantity < 0.25) return { quantity: 0.25, unit };
        if (quantity < 1) return { quantity: Math.ceil(quantity * 4) / 4, unit }; // Round to 0.25 increments
        return { quantity: Math.ceil(quantity * 2) / 2, unit }; // Round to 0.5 increments for larger amounts
    }

    // For other units, round to 2 decimal places but favor rounding up
    return { quantity: Math.ceil(quantity * 100) / 100, unit };
}

/**
 * Scale ingredient quantity by a factor with smart shopping rounding
 */
export function scaleIngredient(ingredient: string, scalingFactor: number): string {
    const parsed = parseIngredient(ingredient);
    const scaledQuantity = parsed.quantity * scalingFactor;

    // Apply smart rounding for shopping practicality
    const smartRounded = smartRoundForShopping(scaledQuantity, parsed.unit, parsed.name);

    // Still apply unit normalization (cups to tbsp, etc.)
    const normalized = normalizeUnits(smartRounded.quantity, smartRounded.unit);

    return formatIngredient(normalized.quantity, normalized.unit, parsed.name);
}