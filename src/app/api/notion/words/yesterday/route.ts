import { NextResponse } from "next/server";
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

        console.log(`[Quiz] Looking for most recent unlearned word`);

        // Helper: Get today's date in local timezone
        const getTodayDateString = (): string => {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, "0");
            const day = String(today.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        };

        const notion = new Notion({ auth: process.env.NOTION_TOKEN });
        const dbId = process.env.NOTION_WORDS_DB_ID!;
        const todayDate = getTodayDateString();

        // Search for most recent unlearned word from PREVIOUS DAYS
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

                // Filter to unlearned words from PREVIOUS DAYS (not today) in this database
                const unlearnedWords = response.results
                    .filter((page: unknown) => {
                        const wordPage = page as NotionWordPage;
                        const isInWordsDb =
                            wordPage.parent?.database_id === dbId;
                        const isUnlearned =
                            wordPage.properties?.learned?.checkbox === false;
                        const pageDate =
                            wordPage.properties?.date?.date?.start || "";
                        const isNotToday = pageDate !== todayDate; // CRITICAL: exclude today
                        return isInWordsDb && isUnlearned && isNotToday;
                    })
                    .sort((a: unknown, b: unknown) => {
                        // Sort by date descending (most recent first)
                        const pageA = a as NotionWordPage;
                        const pageB = b as NotionWordPage;
                        const dateA = pageA.properties?.date?.date?.start || "";
                        const dateB = pageB.properties?.date?.date?.start || "";
                        return dateB.localeCompare(dateA);
                    });

                return unlearnedWords;
            },
            [],
            "searchMostRecentUnlearnedWord"
        );

        if (
            !searchResult.success ||
            !searchResult.data ||
            searchResult.data.length === 0
        ) {
            console.log(`[Quiz] No unlearned words found in database`);
            return NextResponse.json({ ok: true, found: false });
        }

        // REAL-TIME VERIFICATION: Use pages.retrieve() to get current learned status
        // This bypasses the search index delay and gives us the actual current state
        const page = searchResult.data[0] as NotionWordPage;
        const pageId = page.id;

        console.log(`[Quiz] Verifying learned status for page ${pageId} in real-time...`);

        const verifyResult = await safeAsyncOperation(
            async () => {
                return await notion.pages.retrieve({ page_id: pageId });
            },
            null,
            "verifyPageLearnedStatus"
        );

        if (!verifyResult.success || !verifyResult.data) {
            console.warn(`[Quiz] Failed to verify page, using search data`);
            // Fallback to search data if verification fails
            const word = page.properties?.word?.title?.[0]?.text?.content || "";
            const learned = page.properties?.learned?.checkbox || false;
            const examplesText =
                page.properties?.examples?.rich_text?.[0]?.text?.content || "[]";
            const definition =
                page.properties?.definition?.rich_text?.[0]?.text?.content || "";

            let examples: string[] = [];
            try {
                examples = JSON.parse(examplesText);
            } catch (err) {
                console.warn("[Quiz] Failed to parse examples JSON:", err);
                examples = [];
            }

            const wordDate = page.properties?.date?.date?.start || "";

            return NextResponse.json({
                ok: true,
                found: true,
                data: {
                    id: pageId,
                    word,
                    learned,
                    examples,
                    definition,
                    date: wordDate,
                },
            });
        }

        // Extract data from verified page
        const verifiedPage = verifyResult.data as NotionWordPage;
        const word = verifiedPage.properties?.word?.title?.[0]?.text?.content || "";
        const learned = verifiedPage.properties?.learned?.checkbox || false;
        const examplesText =
            verifiedPage.properties?.examples?.rich_text?.[0]?.text?.content || "[]";
        const definition =
            verifiedPage.properties?.definition?.rich_text?.[0]?.text?.content || "";

        // Parse examples from JSON
        let examples: string[] = [];
        try {
            examples = JSON.parse(examplesText);
        } catch (err) {
            console.warn("[Quiz] Failed to parse examples JSON:", err);
            examples = [];
        }

        const wordDate = verifiedPage.properties?.date?.date?.start || "";

        console.log(
            `[Quiz] ✓ VERIFIED most recent word: "${word}" from ${wordDate}, learned: ${learned} (real-time), examples count: ${examples.length}`
        );

        // If the word was actually learned (real-time check), return found: false
        if (learned) {
            console.log(`[Quiz] Word "${word}" is actually learned (verified), skipping`);
            return NextResponse.json({ ok: true, found: false });
        }

        return NextResponse.json({
            ok: true,
            found: true,
            data: {
                id: pageId,
                word,
                learned,
                examples,
                definition,
                date: wordDate,
            },
        });
    } catch (error) {
        return handleAPIError(
            error,
            "/api/notion/words/yesterday",
            "Failed to fetch most recent unlearned word"
        );
    }
}
