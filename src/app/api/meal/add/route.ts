import { NextRequest, NextResponse } from "next/server";
import { Client as Notion } from "@notionhq/client";
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
                URL: url ? { url } : undefined,
                Tags: { multi_select: tags.map((t: string) => ({ name: t })) },
                Approved: { checkbox: true },
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
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e.message },
            { status: 500 }
        );
    }
}
