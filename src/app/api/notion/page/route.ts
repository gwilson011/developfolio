import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import {
    handleAPIError,
    validateEnvironment,
    safeAsyncOperation
} from "@/utils/error-handling";
import { NotionBlock, PageBlocksResponse } from "@/app/types/recipe";

export const dynamic = "force-dynamic";

/**
 * Recursively fetch all blocks and their children from a Notion page/block
 */
async function fetchBlocksRecursively(
    notion: Client,
    blockId: string
): Promise<NotionBlock[]> {
    const blocks: NotionBlock[] = [];
    let cursor: string | undefined;

    // Fetch all children with pagination
    do {
        const response = await notion.blocks.children.list({
            block_id: blockId,
            start_cursor: cursor,
            page_size: 100,
        });

        blocks.push(...(response.results as NotionBlock[]));
        cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
    } while (cursor);

    // Recursively fetch children for blocks that have them
    for (const block of blocks) {
        if (block.has_children) {
            block.children = await fetchBlocksRecursively(notion, block.id);
        }
    }

    return blocks;
}

export async function GET() {
    try {
        // 1. Validate required environment variables
        const envError = validateEnvironment(
            ['NOTION_TOKEN', 'NOTION_PAGE_ID'],
            '/api/notion/page'
        );
        if (envError) return envError;

        // 2. Fetch blocks from the page recursively
        const result = await safeAsyncOperation(
            async () => {
                const notion = new Client({ auth: process.env.NOTION_TOKEN });
                const pageId = process.env.NOTION_PAGE_ID!;

                return await fetchBlocksRecursively(notion, pageId);
            },
            [],
            'fetchPageBlocks'
        );

        if (!result.success || !result.data) {
            console.error('[/api/notion/page] Failed to fetch blocks:', result.error);
            return NextResponse.json({
                ok: false,
                error: 'Failed to fetch page blocks',
                context: '/api/notion/page',
            }, { status: 500 });
        }

        console.log(`[/api/notion/page] Successfully fetched ${result.data.length} blocks`);

        const response: PageBlocksResponse = {
            ok: true,
            pageId: process.env.NOTION_PAGE_ID,
            blocks: result.data,
            count: result.data.length
        };

        return NextResponse.json(response);

    } catch (error) {
        return handleAPIError(
            error,
            '/api/notion/page',
            'Failed to retrieve page blocks'
        );
    }
}
