import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const notion = new Client({ auth: process.env.NOTION_TOKEN });

        const response = await notion.search({
            page_size: 100,
        });

        const databases = response.results
            .filter((item: any) => item.object === "database")
            .map((db: any) => ({
                type: "database",
                title: db.title?.[0]?.plain_text || "Untitled",
                id: db.id,
                url: `https://notion.so/${db.id.replace(/-/g, '')}`,
            }));

        const pages = response.results
            .filter((item: any) => item.object === "page")
            .map((page: any) => ({
                type: "page",
                title: page.properties?.title?.title?.[0]?.plain_text ||
                       page.properties?.Name?.title?.[0]?.text?.content ||
                       "Untitled",
                id: page.id,
                url: `https://notion.so/${page.id.replace(/-/g, '')}`,
                parent: page.parent,
            }));

        return NextResponse.json({
            ok: true,
            databases,
            pages: pages.slice(0, 20), // First 20 pages
            totalDatabases: databases.length,
            totalPages: pages.length,
        });
    } catch (error: any) {
        return NextResponse.json(
            { ok: false, error: error.message },
            { status: 500 }
        );
    }
}
