import { WordData } from "@/app/types/words";
import {
    handleAPIError,
    safeAsyncOperation,
    validateEnvironment,
} from "@/utils/error-handling";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        // 1. Validate environment
        const envError = validateEnvironment(
            ["WORDNIK_API_KEY"],
            "/api/wordnik"
        );
        if (envError) return envError;

        // Fetch word data from Wordnik API
        const wordOfTheDay = await safeAsyncOperation(
            async () => {
                const response = await fetch(
                    `https://api.wordnik.com/v4/words.json/wordOfTheDay?api_key=${process.env.WORDNIK_API_KEY}`,
                    {
                        headers: {
                            Accept: "application/json",
                        },
                        signal: AbortSignal.timeout(30000),
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        `Wordnik API error: ${response.status} ${response.statusText}`
                    );
                }

                const data = await response.json();

                return data;
            },
            undefined,
            "fetchWordOfTheDay"
        );

        if (!wordOfTheDay.success) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Failed to fetch word of the day from Wordnik API",
                    context: "/api/wordnik",
                },
                { status: 503 }
            );
        }

        //console.log("Word of the Day data:", wordOfTheDay.data);

        const hyphenation = await safeAsyncOperation(
            async () => {
                const word = wordOfTheDay.data.word;
                const response = await fetch(
                    `https://api.wordnik.com/v4/word.json/${word}/hyphenation?useCanonical=false&limit=50&api_key=${process.env.WORDNIK_API_KEY}`,
                    {
                        headers: {
                            Accept: "application/json",
                        },
                        signal: AbortSignal.timeout(30000),
                    }
                );
                if (!response.ok) {
                    throw new Error(
                        `Wordnik API error: ${response.status} ${response.statusText}`
                    );
                }

                const data = await response.json();

                return data;
            },
            undefined,
            "fetchHyphenation"
        );

        // const partOfSpeech = await safeAsyncOperation(
        //     async () => {
        //         const word = wordOfTheDay.data.word;
        //         const response = await fetch(`/api/spacy/analyze?word=${word}`);
        //         const data = await response.json();
        //         return SpacyResponseSchema.parse(data);
        //     },
        //     undefined,
        //     "fetchPartOfSpeech"
        // );

        const wordData: WordData = {
            _id: wordOfTheDay.data._id,
            word: wordOfTheDay.data.word,
            definition:
                wordOfTheDay.data.definitions?.[0]?.text ||
                "No definition found",
            examples:
                wordOfTheDay.data.examples?.map(
                    (ex: any) => ex.text as string
                ) || [],
            hyphenation: hyphenation.success
                ? hyphenation.data.map((h: any) => h.text as string)
                : [wordOfTheDay.data.word],
            pos: wordOfTheDay.data.definitions?.[0]?.partOfSpeech || null,
        };

        console.log("Fetched Word of the Day:", wordData);
        return NextResponse.json({ ok: true, data: wordData });
    } catch (error) {
        return handleAPIError(
            error,
            "/api/wordnik",
            "Failed to fetch word of the day"
        );
    }
}
