import { NextResponse } from "next/server";
export async function GET() {
    return NextResponse.json({
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasNotionToken: !!process.env.NOTION_TOKEN,
    });
}
