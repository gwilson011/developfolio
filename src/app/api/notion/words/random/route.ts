import { NextRequest, NextResponse } from "next/server";
import { Client as Notion } from "@notionhq/client";
import {
    validateEnvironment,
    handleAPIError,
    safeAsyncOperation,
} from "@/utils/error-handling";

export const dynamic = "force-dynamic";

interface NotionWordPage {
    id: string;
    parent?: { database_id?: string };
    properties: {
        word?: { title?: Array<{ text?: { content?: string } }> };
        [key: string]: unknown;
    };
}

export async function GET(req: NextRequest) {
    try {
        // Validate environment variables
        const envError = validateEnvironment(
            ["NOTION_TOKEN", "NOTION_WORDS_DB_ID"],
            "/api/notion/words/random"
        );
        if (envError) return envError;

        // Parse query params
        const { searchParams } = new URL(req.url);
        const excludeWord = searchParams.get("exclude") || "";
        const count = parseInt(searchParams.get("count") || "2");

        console.log(
            `[Random] Fetching ${count} random words, excluding: "${excludeWord}"`
        );

        const notion = new Notion({ auth: process.env.NOTION_TOKEN });
        const dbId = process.env.NOTION_WORDS_DB_ID!;

        // Fetch all words from database
        const wordsResult = await safeAsyncOperation(
            async () => {
                const response = await notion.search({
                    filter: { value: "page", property: "object" },
                    page_size: 100,
                });

                // Filter to only pages in words database
                const wordsInDb = response.results
                    .filter((page: unknown) => {
                        const wordPage = page as NotionWordPage;
                        return wordPage.parent?.database_id === dbId;
                    })
                    .map((page: unknown) => {
                        const wordPage = page as NotionWordPage;
                        return (
                            wordPage.properties?.word?.title?.[0]?.text
                                ?.content || ""
                        );
                    })
                    .filter((word) => word.length > 0);

                return wordsInDb;
            },
            [],
            "fetchAllWords"
        );

        if (!wordsResult.success || !wordsResult.data) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Failed to fetch words",
                    details: wordsResult.error,
                },
                { status: 500 }
            );
        }

        // Filter out excluded word (case-insensitive)
        const allWords = wordsResult.data.filter(
            (word: string) => word.toLowerCase() !== excludeWord.toLowerCase()
        );

        console.log(
            `[Random] Found ${allWords.length} words after excluding "${excludeWord}"`
        );

        // Handle edge case: not enough words
        if (allWords.length < count) {
            console.warn(
                `[Random] Only ${allWords.length} words available, requested ${count}`
            );
            return NextResponse.json({
                ok: true,
                data: allWords,
                warning: `Only ${allWords.length} words available, requested ${count}`,
            });
        }

        // Shuffle and select random words
        const shuffled = allWords.sort(() => Math.random() - 0.5);
        const randomWords = shuffled.slice(0, count);

        console.log(`[Random] Returning words:`, randomWords);

        return NextResponse.json({
            ok: true,
            data: randomWords,
        });
    } catch (error) {
        return handleAPIError(
            error,
            "/api/notion/words/random",
            "Failed to fetch random words"
        );
    }
}
