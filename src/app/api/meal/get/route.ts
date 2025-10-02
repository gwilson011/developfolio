import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { handleAPIError, safeAsyncOperation, validateEnvironment } from "@/utils/error-handling";
import { MealData, NotionPage } from "@/app/types/recipe";
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
                .filter((page) =>
                    page && typeof page === 'object' && 'properties' in page &&
                    (page as NotionPage).parent?.database_id === mealsDbId
                )
                .map((page): MealData => {
                    const notionPage = page as NotionPage;
                    return {
                        name: notionPage.properties.Name?.title?.[0]?.text?.content || "Untitled",
                        ingredients:
                            notionPage.properties.Ingredients?.rich_text?.[0]?.text?.content?.split(
                                ", "
                            ) || [],
                        instructions:
                            notionPage.properties.Notes?.rich_text?.[0]?.text?.content || "",
                        calories: notionPage.properties["Calories per Serving"]?.number || 0,
                        servings: notionPage.properties.Servings?.number || 1,
                        protein: notionPage.properties["Protein per Serving"]?.number || 0,
                        carbs: notionPage.properties["Carbs per Serving"]?.number || 0,
                        fat: notionPage.properties["Fat per Serving"]?.number || 0,
                        fiber: notionPage.properties["Fiber per Serving"]?.number || 0,
                        mealType: notionPage.properties["Meal Type"]?.multi_select?.map((type) => type.name) || [],
                        tags: notionPage.properties.Tags?.multi_select?.map((tag) => tag.name) || [],
                    };
                });

            return meals;
        }, [], "fetchMealsFromNotion");

        return NextResponse.json({ ok: result.success, meals: result.data });
    } catch (error) {
        return handleAPIError(error, '/api/meal/get', "Failed to fetch meals");
    }
}
