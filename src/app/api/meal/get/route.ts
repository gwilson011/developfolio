import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { handleAPIError, safeAsyncOperation, validateEnvironment } from "@/utils/error-handling";
import { NotionPage, MealData } from "@/app/types/recipe";
export const dynamic = "force-dynamic"; // disable caching

export async function GET() {
    try {
        // Validate environment variables
        const envError = validateEnvironment(['NOTION_TOKEN', 'NOTION_MEALS_DB_ID'], '/api/meal/get');
        if (envError) return envError;

        // Use safe async operation for Notion API call
        const result = await safeAsyncOperation(async () => {
            const notion = new Client({ auth: process.env.NOTION_TOKEN });
            const mealsDbId = process.env.NOTION_MEALS_DB_ID;

            const response = await notion.search({
                filter: { value: "page", property: "object" },
                page_size: 50,
            });

            const meals: MealData[] = response.results
                .filter((page): page is any =>
                    page && typeof page === 'object' && 'properties' in page &&
                    (page as any).parent?.database_id === mealsDbId
                )
                .map((page: any): MealData => ({
                    name: page.properties.Name?.title?.[0]?.text?.content || "Untitled",
                    ingredients:
                        page.properties.Ingredients?.rich_text?.[0]?.text?.content?.split(
                            ", "
                        ) || [],
                    instructions:
                        page.properties.Notes?.rich_text?.[0]?.text?.content || "",
                    calories: page.properties["Calories per Serving"]?.number || 0,
                    servings: page.properties.Servings?.number || 1,
                    protein: page.properties["Protein per Serving"]?.number || 0,
                    carbs: page.properties["Carbs per Serving"]?.number || 0,
                    fat: page.properties["Fat per Serving"]?.number || 0,
                    fiber: page.properties["Fiber per Serving"]?.number || 0,
                    mealType: page.properties["Meal Type"]?.multi_select?.map((type: any) => type.name) || [],
                    tags: page.properties.Tags?.multi_select?.map((tag: any) => tag.name) || [],
                }));

            return meals;
        }, [], "fetchMealsFromNotion");

        return NextResponse.json({ ok: result.success, meals: result.data });
    } catch (error) {
        return handleAPIError(error, '/api/meal/get', "Failed to fetch meals");
    }
}
