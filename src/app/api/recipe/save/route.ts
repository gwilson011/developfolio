import { NextRequest, NextResponse } from "next/server";
import { Client as Notion } from "@notionhq/client";
import { RecipeForNotion } from "@/app/types/recipe";

const notion = new Notion({ auth: process.env.NOTION_TOKEN });

export const dynamic = "force-dynamic"; // disable caching

export async function POST(req: NextRequest) {
    try {
        if (!process.env.NOTION_MEALS_DB_ID) {
            throw new Error("NOTION_MEALS_DB_ID missing");
        }

        const recipe: RecipeForNotion = await req.json();

        if (!recipe.name) {
            return NextResponse.json(
                { ok: false, error: "Recipe name is required" },
                { status: 400 }
            );
        }

        const page = await notion.pages.create({
            parent: { database_id: process.env.NOTION_MEALS_DB_ID },
            properties: {
                Name: {
                    title: [
                        {
                            type: "text",
                            text: { content: recipe.name },
                        },
                    ],
                },
                Ingredients: {
                    rich_text: [
                        {
                            type: "text",
                            text: { content: recipe.ingredients },
                        },
                    ],
                },
                ...(recipe.url ? { URL: { url: recipe.url } } : {}),
                "Meal Type": {
                    multi_select: recipe.mealType.map((type: string) => ({ name: type }))
                },
                Tags: {
                    multi_select: recipe.tags.map((tag: string) => ({ name: tag }))
                },
                Notes: {
                    rich_text: [
                        {
                            type: "text",
                            text: { content: recipe.notes || "" },
                        },
                    ],
                },
                Approved: { checkbox: recipe.approved },
                Servings: { number: recipe.servings },
                "Calories per Serving": { number: recipe.caloriesPerServing },
                "Protein per Serving": { number: recipe.proteinPerServing || 0 },
                "Carbs per Serving": { number: recipe.carbsPerServing || 0 },
                "Fat per Serving": { number: recipe.fatPerServing || 0 },
                "Fiber per Serving": { number: recipe.fiberPerServing || 0 },
            },
        });

        // Add instructions as page content
        if (recipe.instructions) {
            await notion.blocks.children.append({
                block_id: page.id,
                children: [
                    {
                        object: "block",
                        type: "heading_2",
                        heading_2: {
                            rich_text: [
                                { type: "text", text: { content: "Instructions" } },
                            ],
                        },
                    },
                    {
                        object: "block",
                        type: "paragraph",
                        paragraph: {
                            rich_text: [
                                { type: "text", text: { content: recipe.instructions } },
                            ],
                        },
                    },
                ],
            });
        }

        return NextResponse.json({ ok: true, id: page.id });
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        console.error("[/api/recipe/save] error:", errorMessage);
        return NextResponse.json(
            { ok: false, error: errorMessage },
            { status: 500 }
        );
    }
}