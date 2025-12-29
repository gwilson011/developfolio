import { NextRequest, NextResponse } from "next/server";
import { Client as Notion } from "@notionhq/client";
import {
    validateEnvironment,
    handleAPIError,
    safeAsyncOperation,
} from "@/utils/error-handling";
import { checkboxProp } from "@/app/utils/notion";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        // Validate environment variables
        const envError = validateEnvironment(
            ["NOTION_TOKEN", "NOTION_WORDS_DB_ID"],
            "/api/notion/words/update-learned"
        );
        if (envError) return envError;

        // Parse request body
        const { wordId, learned } = await req.json();

        // Validation
        if (!wordId || typeof learned !== "boolean") {
            return NextResponse.json(
                {
                    ok: false,
                    error: "wordId (string) and learned (boolean) are required",
                    context: "/api/notion/words/update-learned",
                },
                { status: 400 }
            );
        }

        console.log(
            `[Update Learned] Setting word ${wordId} learned status to: ${learned}`
        );

        const notion = new Notion({ auth: process.env.NOTION_TOKEN });

        // Update page property
        const updateResult = await safeAsyncOperation(
            async () => {
                await notion.pages.update({
                    page_id: wordId,
                    properties: {
                        learned: checkboxProp(learned),
                    },
                });
                return true;
            },
            false,
            "updateLearnedStatus"
        );

        if (!updateResult.success) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Failed to update learned status",
                    details: updateResult.error,
                    context: "/api/notion/words/update-learned",
                },
                { status: 500 }
            );
        }

        console.log(`[Update Learned] Successfully updated word ${wordId}`);

        return NextResponse.json({
            ok: true,
            updated: true,
            wordId,
            learned,
        });
    } catch (error) {
        return handleAPIError(
            error,
            "/api/notion/words/update-learned",
            "Failed to update learned status"
        );
    }
}
