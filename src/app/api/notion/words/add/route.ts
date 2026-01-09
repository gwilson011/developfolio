import { NextRequest, NextResponse } from "next/server";
import { Client as Notion } from "@notionhq/client";
import {
    validateEnvironment,
    handleAPIError,
    safeAsyncOperation,
} from "@/utils/error-handling";
import {
    titleProp,
    dateProp,
    textProp,
    checkboxProp,
} from "@/app/utils/notion";

export const dynamic = "force-dynamic";

// Helper: Get today's date in UTC timezone (for consistency across environments)
const getLocalDateString = (): string => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

interface NotionWordPage {
    id: string;
    parent?: { database_id?: string };
    properties: {
        word?: { title?: Array<{ text?: { content?: string } }> };
        [key: string]: unknown;
    };
}

export async function POST(req: NextRequest) {
    try {
        // Validate environment variables
        const envError = validateEnvironment(
            ["NOTION_TOKEN", "NOTION_WORDS_DB_ID"],
            "/api/notion/words/add"
        );
        if (envError) return envError;

        // Parse request body
        const { word, definition, examples, date } = await req.json();

        // Basic validation
        if (!word || !definition) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "word and definition are required",
                    context: "/api/notion/words/add",
                },
                { status: 400 }
            );
        }

        const notion = new Notion({ auth: process.env.NOTION_TOKEN });
        const dbId = process.env.NOTION_WORDS_DB_ID!;

        // Check for duplicates using notion.search()
        const duplicateCheck = await safeAsyncOperation(
            async () => {
                const response = await notion.search({
                    filter: { value: "page", property: "object" },
                    sort: {
                        direction: "descending",
                        timestamp: "last_edited_time",
                    },
                    page_size: 100,
                });

                console.log(
                    `[Duplicate Check] Searching for word: "${word}" in database: ${dbId}`
                );

                // Filter by database_id and word title
                const existingWords = response.results.filter(
                    (page: unknown) => {
                        const wordPage = page as NotionWordPage;
                        const isInWordsDb =
                            wordPage.parent?.database_id === dbId;
                        const titleText =
                            wordPage.properties?.word?.title?.[0]?.text
                                ?.content;
                        const matchesWord =
                            titleText?.toLowerCase() === word.toLowerCase();

                        //console.log(`[Page Check] DB match: ${isInWordsDb}, Title: "${titleText}", Word match: ${matchesWord}`);

                        return isInWordsDb && matchesWord;
                    }
                );

                console.log(
                    `[Duplicate Check] Found ${existingWords.length} existing words`
                );
                return existingWords.length > 0;
            },
            false,
            "checkDuplicateWord"
        );

        // If duplicate exists, return success (silent skip)
        if (duplicateCheck.data) {
            console.log(`[Skip] Word "${word}" already exists in database`);
            return NextResponse.json({
                ok: true,
                skipped: true,
                message: "Word already exists in database",
            });
        }

        console.log(`[Create] Creating new word: "${word}"`);

        // Create new page in Notion database
        const createResult = await safeAsyncOperation(
            async () => {
                const page = await notion.pages.create({
                    parent: { database_id: dbId },
                    properties: {
                        word: titleProp(word),
                        date: dateProp(date || getLocalDateString()),
                        definition: textProp(definition),
                        examples: textProp(
                            Array.isArray(examples)
                                ? JSON.stringify(examples)
                                : examples || "[]"
                        ),
                        learned: checkboxProp(false),
                    },
                });
                console.log(
                    `[Create] Successfully created page with ID: ${page.id}`
                );
                return page.id;
            },
            null,
            "createWordPage"
        );

        if (!createResult.success) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Failed to create word in Notion",
                    details: createResult.error,
                    context: "/api/notion/words/add",
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            id: createResult.data,
            created: true,
        });
    } catch (error) {
        return handleAPIError(
            error,
            "/api/notion/words/add",
            "Failed to add word to Notion"
        );
    }
}
