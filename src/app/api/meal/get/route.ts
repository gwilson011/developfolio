import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
export const dynamic = "force-dynamic"; // disable caching

export async function GET() {
    try {
        const notion = new Client({ auth: process.env.NOTION_TOKEN });
        const mealsDbId = process.env.NOTION_MEALS_DB_ID;

        if (!mealsDbId) {
            return NextResponse.json({ ok: false, meals: [] });
        }

        const response = await notion.search({
            filter: { value: "page", property: "object" },
            page_size: 50,
        });

        const meals = response.results
            .filter((page: any) => page.parent?.database_id === mealsDbId)
            .map((page: any) => ({
                name: page.properties.Name?.title?.[0]?.text?.content || "Untitled",
                ingredients:
                    page.properties.Ingredients?.rich_text?.[0]?.text?.content?.split(
                        ", "
                    ) || [],
                instructions:
                    page.properties.Notes?.rich_text?.[0]?.text?.content || "",
                calories: page.properties["Calories per Serving"]?.number || 0,
                servings: page.properties.Servings?.number || 1,
                mealType: page.properties["Meal Type"]?.multi_select?.map((type: any) => type.name) || [],
                tags: page.properties.Tags?.multi_select?.map((tag: any) => tag.name) || [],
            }));

        return NextResponse.json({ ok: true, meals });
    } catch (error) {
        console.error("Error fetching meals from Notion:", error);
        return NextResponse.json({ ok: false, meals: [] });
    }
}
