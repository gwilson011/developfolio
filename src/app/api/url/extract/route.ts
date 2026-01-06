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

        // Validate URL format
        try {
            new URL(url);
        } catch {
            return NextResponse.json(
                { ok: false, error: "Please provide a valid URL" },
                { status: 400 }
            );
        }

        try {
            // Scrape the webpage
            const scrapedData = await scrapeWebpage(url);

            return NextResponse.json({
                ok: true,
                data: scrapedData
            });

        } catch (scrapeError: unknown) {
            const errorMessage = scrapeError instanceof Error ? scrapeError.message : 'Unknown error';
            console.warn("URL scraping failed:", errorMessage);

            // Return error for non-accessible URLs
            if (errorMessage.includes('HTTP') || errorMessage.includes('fetch')) {
                return NextResponse.json(
                    { ok: false, error: "Could not reach URL. Check if it's accessible" },
                    { status: 500 }
                );
            }

            // Return error for pages with no content
            if (errorMessage.includes('No content')) {
                return NextResponse.json(
                    { ok: false, error: "No recipe content detected on this page" },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                { ok: false, error: errorMessage },
                { status: 500 }
            );
        }

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error("[/api/url/extract] error:", errorMessage);
        return NextResponse.json(
            { ok: false, error: errorMessage },
            { status: 500 }
        );
    }
}

async function scrapeWebpage(url: string) {
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
        const response = await fetch(url, {
            headers,
            method: 'GET',
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Remove script and style tags to clean up content
        $('script').remove();
        $('style').remove();
        $('nav').remove();
        $('header').remove();
        $('footer').remove();
        $('.advertisement').remove();
        $('.ad').remove();

        // Extract page title
        const pageTitle = $('title').text() || $('h1').first().text() || "";

        // Extract main content from common containers
        let mainContent = "";

        // Try common recipe content selectors first
        const contentSelectors = [
            'article',
            '[itemtype*="Recipe"]',
            '.recipe',
            '#recipe',
            'main',
            '.content',
            '#content',
            'body'
        ];

        for (const selector of contentSelectors) {
            const element = $(selector).first();
            if (element.length > 0) {
                mainContent = element.text();
                if (mainContent.trim().length > 200) {
                    break; // Found substantial content
                }
            }
        }

        // Clean up whitespace
        mainContent = mainContent
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, '\n')
            .trim();

        // Extract meta description as fallback
        const metaDescription = $('meta[property="og:description"]').attr('content') ||
                            $('meta[name="description"]').attr('content') ||
                            "";

        // Extract author from meta tags
        const author = $('meta[property="og:site_name"]').attr('content') ||
                    $('meta[name="author"]').attr('content') ||
                    new URL(url).hostname ||
                    "Website";

        // Combine title, meta description, and main content
        const combinedContent = `${pageTitle}\n\n${metaDescription}\n\n${mainContent}`.trim();

        if (!combinedContent || combinedContent.length < 100) {
            throw new Error("No content found on page - page may be private or dynamically loaded");
        }

        // Return in InstagramData format for compatibility with existing pipeline
        return {
            url: url,
            caption: combinedContent,
            images: [], // No image extraction as per requirements
            author: author,
            timestamp: new Date().toISOString(),
            comments: [] // Not applicable for web scraping
        };

    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error("Request timed out. Try again");
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}
