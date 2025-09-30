import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic"; // disable caching

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json(
                { ok: false, error: "URL is required" },
                { status: 400 }
            );
        }

        // Basic Instagram URL validation
        if (!url.includes("instagram.com")) {
            return NextResponse.json(
                { ok: false, error: "Please provide a valid Instagram URL" },
                { status: 400 }
            );
        }

        try {
            // Attempt to scrape Instagram content
            const scrapedData = await scrapeInstagramPost(url);

            // If we have images, try to extract text from them using OCR
            if (scrapedData.images && scrapedData.images.length > 0) {
                try {
                    const ocrResponse = await fetch(`${req.url.replace('/instagram/extract', '/ocr/extract')}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageUrls: scrapedData.images })
                    });

                    if (ocrResponse.ok) {
                        const ocrData = await ocrResponse.json();
                        if (ocrData.ok && ocrData.combinedText) {
                            // Combine OCR text with caption
                            scrapedData.caption = scrapedData.caption
                                ? `${scrapedData.caption}\n\n[From Images]:\n${ocrData.combinedText}`
                                : `[From Images]:\n${ocrData.combinedText}`;
                        }
                    }
                } catch (ocrError) {
                    console.warn("OCR extraction failed, continuing without image text");
                }
            }

            return NextResponse.json({
                ok: true,
                data: scrapedData
            });

        } catch (scrapeError: any) {
            console.warn("Instagram scraping failed:", scrapeError.message);
            // Fallback to mock data if scraping fails
            const mockData = {
                url: url,
                caption: "Mock recipe: Delicious pasta with fresh ingredients\n\nIngredients:\n- 2 cups pasta\n- 1 cup tomatoes\n- 1/2 cup cheese\n- 2 tbsp olive oil\n- Salt and pepper to taste\n\nInstructions:\n1. Boil pasta until al dente\n2. Sauté tomatoes with olive oil\n3. Mix with pasta and cheese\n4. Season with salt and pepper",
                images: [
                    "https://via.placeholder.com/400x400?text=Recipe+Image"
                ],
                author: "chef_mock",
                timestamp: new Date().toISOString(),
                comments: [
                    "This looks amazing!",
                    "Can I substitute the cheese with vegan cheese?",
                    "Made this last night, so good!"
                ]
            };

            return NextResponse.json({
                ok: true,
                data: mockData,
                note: "Used mock data due to scraping limitations"
            });
        }

    } catch (error: any) {
        console.error("[/api/instagram/extract] error:", error?.message);
        return NextResponse.json(
            { ok: false, error: error?.message ?? "Unknown error" },
            { status: 500 }
        );
    }
}

async function scrapeInstagramPost(url: string) {
    // Convert Instagram post URL to a more scrapable format if needed
    const cleanUrl = url.replace(/\?.*$/, ""); // Remove query parameters

    // Use a realistic user agent to avoid being blocked
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    };

    const response = await fetch(cleanUrl, {
        headers,
        method: 'GET'
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Try to extract data from Instagram's page structure
    // Note: Instagram's structure changes frequently, so this is a basic attempt

    // Look for JSON-LD structured data
    let caption = "";
    let images: string[] = [];
    let author = "";
    let timestamp = "";
    let comments: string[] = [];

    // Try to find data in script tags (Instagram often puts data in JSON)
    $('script[type="application/ld+json"]').each((_, element) => {
        try {
            const jsonData = JSON.parse($(element).html() || "{}");
            if (jsonData.description) {
                caption = jsonData.description;
            }
            if (jsonData.author && jsonData.author.name) {
                author = jsonData.author.name;
            }
            if (jsonData.image) {
                if (Array.isArray(jsonData.image)) {
                    images = jsonData.image;
                } else if (typeof jsonData.image === 'string') {
                    images = [jsonData.image];
                }
            }
        } catch (e) {
            // Continue if JSON parsing fails
        }
    });

    // Try alternative methods to extract content
    if (!caption) {
        // Look for meta tags
        caption = $('meta[property="og:description"]').attr('content') || "";
        if (!caption) {
            caption = $('meta[name="description"]').attr('content') || "";
        }
    }

    if (images.length === 0) {
        const ogImage = $('meta[property="og:image"]').attr('content');
        if (ogImage) {
            images = [ogImage];
        }
    }

    if (!author) {
        author = $('meta[property="og:site_name"]').attr('content') || "Instagram User";
    }

    // If we still don't have much data, the post might be private or blocked
    if (!caption && images.length === 0) {
        throw new Error("Unable to extract post content - post may be private or protected");
    }

    return {
        url: url,
        caption: caption || "No caption found",
        images: images,
        author: author,
        timestamp: timestamp || new Date().toISOString(),
        comments: comments // Comments are typically not scrapable due to dynamic loading
    };
}