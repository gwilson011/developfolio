import { NextRequest, NextResponse } from "next/server";
import { InstagramData, ParsedRecipeData } from "@/app/types/recipe";
import { formatIngredient, parseIngredient } from "@/utils/ingredients";
import OpenAI from "openai";

export const dynamic = "force-dynamic"; // disable caching

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
    try {
        const { instagramData }: { instagramData: InstagramData } = await req.json();

        if (!instagramData) {
            return NextResponse.json(
                { ok: false, error: "Instagram data is required" },
                { status: 400 }
            );
        }

        if (!process.env.OPENAI_API_KEY) {
            console.warn("OpenAI API key not found, using mock data");
            return getMockParsedRecipe();
        }

        try {
            const prompt = createRecipeParsingPrompt(instagramData);

            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a culinary expert that extracts recipe information from social media posts. Always respond with valid JSON only, no additional text."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 1500,
            });

            const response = completion.choices[0]?.message?.content;
            if (!response) {
                throw new Error("No response from OpenAI");
            }

            // Parse the JSON response
            const parsedRecipe = JSON.parse(response) as ParsedRecipeData;

            // Validate the parsed recipe
            if (!parsedRecipe.name || !parsedRecipe.ingredients || !parsedRecipe.instructions) {
                throw new Error("Invalid recipe format from AI");
            }

            // Add instagram tag if not present
            if (!parsedRecipe.tags.includes("instagram")) {
                parsedRecipe.tags.push("instagram");
            }

            // Standardize ingredients with smart parsing
            parsedRecipe.ingredients = parsedRecipe.ingredients.map(ingredient => {
                const parsed = parseIngredient(ingredient);
                return formatIngredient(parsed.quantity, parsed.unit, parsed.name);
            });

            return NextResponse.json({
                ok: true,
                recipe: parsedRecipe
            });

        } catch (aiError: unknown) {
            console.error("AI parsing failed:", aiError instanceof Error ? aiError.message : 'Unknown error');
            // Fallback to mock data if AI fails
            return getMockParsedRecipe();
        }

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error("[/api/recipe/parse] error:", errorMessage);
        return NextResponse.json(
            { ok: false, error: errorMessage },
            { status: 500 }
        );
    }
}

function getMockParsedRecipe() {
    const mockParsedRecipe: ParsedRecipeData = {
        name: "Delicious Pasta Recipe",
        ingredients: [
            "2 cups pasta",
            "1 cup diced tomatoes",
            "1/2 cup shredded cheese",
            "2 tablespoons olive oil",
            "Salt to taste",
            "Black pepper to taste"
        ],
        instructions: "1. Boil pasta in salted water until al dente (8-10 minutes).\n2. In a separate pan, heat olive oil over medium heat.\n3. Add diced tomatoes and cook for 5 minutes until softened.\n4. Drain pasta and add to the tomato mixture.\n5. Stir in cheese until melted.\n6. Season with salt and pepper to taste.\n7. Serve immediately while hot.",
        servings: 2,
        estimatedCalories: 640,
        confidence: 0.85,
        mealTypes: ["lunch", "dinner"],
        tags: ["pasta", "vegetarian", "quick", "instagram"],
        notes: "From Instagram post. User comments suggest substituting cheese with vegan alternative is possible."
    };

    return NextResponse.json({
        ok: true,
        recipe: mockParsedRecipe
    });
}

// Helper function to create AI prompt for recipe parsing
function createRecipeParsingPrompt(instagramData: InstagramData): string {
    const commentsAnalysis = instagramData.comments.length > 0
        ? `\n\nCOMMENT ANALYSIS:
Analyze these comments for useful cooking information:
${instagramData.comments.join("\n")}

Look for:
- Substitution suggestions (e.g., "can I use X instead of Y?")
- Cooking tips and modifications (e.g., "I added extra garlic", "cook for longer")
- Serving suggestions and variations
- Success stories with modifications
- Dietary adaptations (vegan, gluten-free, etc.)
- Storage and reheating tips`
        : '';

    return `
Analyze this Instagram post and extract recipe information. Return ONLY valid JSON in the exact format specified below.

POST CONTENT:
Caption: ${instagramData.caption}${commentsAnalysis}

Extract and return JSON in this EXACT format:
{
  "name": "Recipe Name (create descriptive name if not explicit)",
  "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity"],
  "instructions": "Numbered step-by-step instructions as a single string",
  "servings": 2,
  "estimatedCalories": 350,
  "confidence": 0.9,
  "mealTypes": ["lunch", "dinner"],
  "tags": ["vegetarian", "quick", "healthy"],
  "notes": "Additional notes from comments, cooking tips, substitutions, and modifications"
}

Guidelines:
- Extract exact ingredient quantities when available (preserve fractions like 1/2, 3/4)
- Create clear numbered instructions (1. 2. 3. etc.)
- Estimate calories based on ingredients and typical portions
- **Determine servings intelligently**: Analyze ingredient quantities and recipe type to determine realistic serving size:
  * Small snacks/appetizers: 1-2 servings
  * Individual meals: 1-2 servings
  * Family-style dishes: 3-6 servings based on ingredient amounts
  * Large batch recipes: 6+ servings
  * Consider total volume of ingredients and typical portion sizes
- Include relevant meal types: breakfast, lunch, dinner, snack, dessert
- Add descriptive tags: cuisine type, dietary restrictions, cooking method, difficulty
- Set confidence 0.7-1.0 based on how complete the recipe info is
- Analyze comments for useful information:
  * Ingredient substitutions mentioned by users
  * Cooking tips and modifications that worked
  * Dietary adaptations (vegan alternatives, gluten-free options)
  * Timing and technique suggestions
  * Serving and storage recommendations
- Include the most valuable comment insights in the notes field
- If ingredients lack quantities, make reasonable estimates based on context
- Consider portion sizes mentioned in caption or comments for servings

Return ONLY the JSON object, no other text.
    `.trim();
}