import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const notion = new Client({ auth: process.env.NOTION_TOKEN });

        // The "words" page ID we found
        const pageId = "2d7c9b34-07ef-807a-a31d-d5000435d6a9";

        const blocks = await notion.blocks.children.list({
            block_id: pageId,
            page_size: 100,
        });

        const databases = blocks.results
            .filter((block: any) => block.type === "child_database")
            .map((block: any) => ({
                id: block.id,
                title: block.child_database?.title || "Untitled",
            }));

        return NextResponse.json({
            ok: true,
            databases,
            allBlocks: blocks.results.map((b: any) => ({
                type: b.type,
                id: b.id,
            })),
        });
    } catch (error: any) {
        return NextResponse.json(
            { ok: false, error: error.message },
            { status: 500 }
        );
    }
}
