import { NextResponse } from "next/server";
import { Client as Notion } from "@notionhq/client";
import {
    validateEnvironment,
    handleAPIError,
    safeAsyncOperation,
} from "@/utils/error-handling";

export const dynamic = "force-dynamic";

// Helper: Get yesterday's date in local timezone
const getYesterdayDateString = (): string => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, "0");
    const day = String(yesterday.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

interface NotionWordPage {
    id: string;
    parent?: { database_id?: string };
    properties: {
        word?: { title?: Array<{ text?: { content?: string } }> };
        learned?: { checkbox?: boolean };
        examples?: { rich_text?: Array<{ text?: { content?: string } }> };
        definition?: { rich_text?: Array<{ text?: { content?: string } }> };
        date?: { date?: { start?: string } };
        [key: string]: unknown;
    };
}

export async function GET() {
    try {
        // Validate environment variables
        const envError = validateEnvironment(
            ["NOTION_TOKEN", "NOTION_WORDS_DB_ID"],
            "/api/notion/words/yesterday"
        );
        if (envError) return envError;

        // Calculate yesterday's date
        const yesterdayDate = getYesterdayDateString();

        console.log(`[Yesterday] Looking for word from ${yesterdayDate}`);

        const notion = new Notion({ auth: process.env.NOTION_TOKEN });
        const dbId = process.env.NOTION_WORDS_DB_ID!;

        // Search for yesterday's word
        const searchResult = await safeAsyncOperation(
            async () => {
                const response = await notion.search({
                    filter: { value: "page", property: "object" },
                    sort: {
                        direction: "descending",
                        timestamp: "last_edited_time",
                    },
                    page_size: 100,
                });

                // Log all words in database for debugging
                const wordsInDb = response.results.filter((page: unknown) => {
                    const wordPage = page as NotionWordPage;
                    return wordPage.parent?.database_id === dbId;
                });

                console.log(
                    `[Yesterday] Found ${wordsInDb.length} total words in database`
                );
                wordsInDb.forEach((page: unknown) => {
                    const wordPage = page as NotionWordPage;
                    const word =
                        wordPage.properties?.word?.title?.[0]?.text?.content;
                    const pageDate = wordPage.properties?.date?.date?.start;
                    console.log(
                        `[Yesterday] - Word: "${word}", Date: "${pageDate}"`
                    );
                });

                // Filter by database_id and date
                const yesterdayWords = response.results.filter(
                    (page: unknown) => {
                        const wordPage = page as NotionWordPage;
                        const isInWordsDb =
                            wordPage.parent?.database_id === dbId;
                        const pageDate = wordPage.properties?.date?.date?.start;
                        const matchesDate = pageDate === yesterdayDate;

                        if (isInWordsDb) {
                            console.log(
                                `[Yesterday] Comparing: "${pageDate}" === "${yesterdayDate}" ? ${matchesDate}`
                            );
                        }

                        return isInWordsDb && matchesDate;
                    }
                );

                return yesterdayWords;
            },
            [],
            "searchYesterdayWord"
        );

        if (
            !searchResult.success ||
            !searchResult.data ||
            searchResult.data.length === 0
        ) {
            console.log(`[Yesterday] No word found for ${yesterdayDate}`);
            return NextResponse.json({ ok: true, found: false });
        }

        // Extract word data
        const page = searchResult.data[0] as NotionWordPage;
        const word = page.properties?.word?.title?.[0]?.text?.content || "";
        const learned = page.properties?.learned?.checkbox || false;
        const examplesText =
            page.properties?.examples?.rich_text?.[0]?.text?.content || "[]";
        const definition =
            page.properties?.definition?.rich_text?.[0]?.text?.content || "";

        // Parse examples from JSON
        let examples: string[] = [];
        try {
            examples = JSON.parse(examplesText);
        } catch (err) {
            console.warn("[Yesterday] Failed to parse examples JSON:", err);
            examples = [];
        }

        console.log(
            `[Yesterday] Found word: "${word}", learned: ${learned}, examples count: ${examples.length}`
        );

        return NextResponse.json({
            ok: true,
            found: true,
            data: {
                id: page.id,
                word,
                learned,
                examples,
                definition,
                date: yesterdayDate,
            },
        });
    } catch (error) {
        return handleAPIError(
            error,
            "/api/notion/words/yesterday",
            "Failed to fetch yesterday's word"
        );
    }
}
