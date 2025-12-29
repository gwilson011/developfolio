import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const notion = new Client({ auth: process.env.NOTION_TOKEN });
        const dbId = process.env.NOTION_WORDS_DB_ID!;

        // Search for pages in this database
        const response = await notion.search({
            filter: { value: "page", property: "object" },
            page_size: 100,
        });

        // Filter to only pages in our database
        const pagesInDb = response.results.filter((page: any) =>
            page.parent?.database_id === dbId
        );

        const properties = pagesInDb.length > 0
            ? Object.keys((pagesInDb[0] as any).properties)
            : [];

        return NextResponse.json({
            ok: true,
            propertyNames: properties,
            totalPages: pagesInDb.length,
            samplePage: pagesInDb[0],
        });
    } catch (error: any) {
        console.error("Query error:", error);
        return NextResponse.json(
            { ok: false, error: error.message, code: error.code },
            { status: 500 }
        );
    }
}
