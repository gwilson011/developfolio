import { NextRequest, NextResponse } from "next/server";
import { Client as Notion } from "@notionhq/client";
export const dynamic = "force-dynamic";
const notion = new Notion({ auth: process.env.NOTION_TOKEN });

export async function POST(req: NextRequest) {
    try {
        if (!process.env.NOTION_MEALS_DB_ID)
            throw new Error("NOTION_MEALS_DB_ID missing");
        const { name, url, tags = [], notes = "" } = await req.json();

        const page = await notion.pages.create({
            parent: { database_id: process.env.NOTION_MEALS_DB_ID },
            properties: {
                Name: {
                    title: [
                        {
                            type: "text",
                            text: { content: name || "Untitled Meal" },
                        },
                    ],
                },
                ...(url ? { URL: { url } } : {}),
                Tags: { multi_select: tags.map((t: string) => ({ name: t })) },
                Approved: { checkbox: true },
                Servings: { number: 1 },
                "Calories per Serving": { number: 0 },
                "Protein per Serving": { number: 0 },
                "Carbs per Serving": { number: 0 },
                "Fat per Serving": { number: 0 },
                "Fiber per Serving": { number: 0 },
            },
            children: notes
                ? [
                      {
                          object: "block",
                          paragraph: {
                              rich_text: [
                                  { type: "text", text: { content: notes } },
                              ],
                          },
                      },
                  ]
                : [],
        });

        return NextResponse.json({ ok: true, id: page.id });
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json(
            { ok: false, error: errorMessage },
            { status: 500 }
        );
    }
}
