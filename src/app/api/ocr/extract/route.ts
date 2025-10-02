import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic"; // disable caching

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
    try {
        const { imageUrls } = await req.json();

        if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            return NextResponse.json(
                { ok: false, error: "Image URLs array is required" },
                { status: 400 }
            );
        }

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { ok: false, error: "OpenAI API key not configured" },
                { status: 500 }
            );
        }

        try {
            const extractedTexts: string[] = [];

            // Process each image URL
            for (const imageUrl of imageUrls) {
                if (!imageUrl || typeof imageUrl !== 'string') {
                    continue;
                }

                try {
                    const completion = await openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        messages: [
                            {
                                role: "user",
                                content: [
                                    {
                                        type: "text",
                                        text: "Extract all text from this image. Focus on any recipe content, ingredients lists, cooking instructions, or nutritional information. Return only the extracted text, preserving line breaks and formatting where possible."
                                    },
                                    {
                                        type: "image_url",
                                        image_url: {
                                            url: imageUrl,
                                            detail: "high"
                                        }
                                    }
                                ]
                            }
                        ],
                        max_tokens: 1000,
                        temperature: 0.1,
                    });

                    const extractedText = completion.choices[0]?.message?.content;
                    if (extractedText && extractedText.trim()) {
                        extractedTexts.push(extractedText.trim());
                    }
                } catch (imageError: unknown) {
                    console.warn(`Failed to process image ${imageUrl}:`, imageError instanceof Error ? imageError.message : 'Unknown error');
                    // Continue with other images even if one fails
                }
            }

            return NextResponse.json({
                ok: true,
                extractedTexts: extractedTexts,
                combinedText: extractedTexts.join("\n\n")
            });

        } catch (ocrError: unknown) {
            console.error("OCR processing failed:", ocrError instanceof Error ? ocrError.message : 'Unknown error');
            return NextResponse.json(
                { ok: false, error: "Failed to extract text from images" },
                { status: 500 }
            );
        }

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error("[/api/ocr/extract] error:", errorMessage);
        return NextResponse.json(
            { ok: false, error: errorMessage },
            { status: 500 }
        );
    }
}