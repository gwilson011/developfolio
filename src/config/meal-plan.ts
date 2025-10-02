// Centralized configuration for meal planning system

export const MEAL_PLAN_CONFIG = {
  // Calorie distribution across meals
  CALORIE_DISTRIBUTION: {
    breakfast: 0.2,   // 20%
    lunch: 0.3,       // 30%
    dinner: 0.35,     // 35%
    snack: 0.15,      // 15%
  },

  // API timeouts and settings
  API: {
    timeouts: {
      plan_generation: 120000,      // 2 minutes
      nutrition_validation: 60000,  // 1 minute
      recipe_import: 30000,         // 30 seconds
    },
    retry_attempts: 2,
    openai_model: "gpt-4o-mini",
    openai_temperature: 0.2,
  },

  // Nutrition targets (configurable per user in future)
  NUTRITION_TARGETS: {
    protein: 120,     // grams
    carbs: 150,       // grams
    fat: 50,          // grams
    fiber: 25,        // grams
  },

  // Validation thresholds
  VALIDATION: {
    calorie_tolerance: 0.15,      // 15% tolerance
    protein_tolerance: 0.1,       // 10% tolerance
    serving_size_tolerance: 0.25, // 25% tolerance
  },

  // Meal planning constraints
  CONSTRAINTS: {
    min_daily_calories: 1000,
    max_daily_calories: 5000,
    max_recipes_per_category: 100,
    max_days_out_of_town: 6,
  },

  // Ingredient parsing settings
  INGREDIENTS: {
    max_recipe_servings: 8,
    default_servings: 1,
    quantity_precision: 2, // decimal places
  },

  // UI settings
  UI: {
    max_search_results: 50,
    default_calorie_filter: 9999,
    animation_duration: 200, // ms
  },
} as const;

// Unit conversion mappings (moved from ingredients.ts)
export const VOLUME_UNITS: { [key: string]: number } = {
  'cup': 1, 'cups': 1,
  'tablespoon': 1/16, 'tablespoons': 1/16, 'tbsp': 1/16,
  'teaspoon': 1/48, 'teaspoons': 1/48, 'tsp': 1/48,
  'fluid ounce': 1/8, 'fluid ounces': 1/8, 'fl oz': 1/8,
  'pint': 2, 'pints': 2,
  'quart': 4, 'quarts': 4,
  'gallon': 16, 'gallons': 16
};

export const WEIGHT_UNITS: { [key: string]: number } = {
  'pound': 1, 'pounds': 1, 'lb': 1, 'lbs': 1,
  'ounce': 1/16, 'ounces': 1/16, 'oz': 1/16,
  'gram': 1/453.6, 'grams': 1/453.6, 'g': 1/453.6,
  'kilogram': 2.205, 'kilograms': 2.205, 'kg': 2.205
};

// Ingredient categorization patterns (moved from grocery.ts)
export const INGREDIENT_CATEGORIES = {
  dairy: [
    'egg', 'milk', 'cheese', 'yogurt', 'butter', 'cream'
  ],
  proteins: [
    'chicken', 'beef', 'salmon', 'tuna', 'tofu', 'lentil',
    'chickpea', 'bean', 'turkey'
  ],
  produce: [
    'spinach', 'broccoli', 'carrot', 'pepper', 'onion', 'tomato',
    'lettuce', 'cucumber', 'celery', 'zucchini', 'mushroom',
    'apple', 'berries', 'banana', 'avocado', 'lemon', 'lime'
  ],
  grains: [
    'rice', 'quinoa', 'oats', 'bread', 'pasta', 'flour',
    'cereal', 'wrap'
  ],
  nuts: [
    'almond', 'walnut', 'cashew', 'pecan', 'peanut', 'pistachio'
  ],
  condiments: [
    'honey', 'oil', 'salt', 'sauce', 'spices', 'vinegar',
    'mustard', 'ketchup', 'mayo', 'hummus', 'dressing'
  ],
} as const;

// Default preferences and settings
export const DEFAULTS = {
  daily_calories: 2000,
  week_start: 'today',
  new_plan_mode: false,
  vegetarian: false,
  dislikes: '',
  instructions: '',
} as const;