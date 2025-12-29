import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const notion = new Client({ auth: process.env.NOTION_TOKEN });
        const dbId = process.env.NOTION_WORDS_DB_ID;

        if (!dbId) {
            return NextResponse.json(
                { ok: false, error: "NOTION_WORDS_DB_ID not set" },
                { status: 500 }
            );
        }

        console.log("Fetching database schema for:", dbId);

        const database = await notion.databases.retrieve({
            database_id: dbId,
        });

        console.log("Database object:", database);

        if (!database || !(database as any).properties) {
            return NextResponse.json(
                { ok: false, error: "Database has no properties", database },
                { status: 500 }
            );
        }

        const properties = Object.entries((database as any).properties).map(
            ([name, prop]: [string, any]) => ({
                name,
                type: prop.type,
                id: prop.id,
            })
        );

        return NextResponse.json({
            ok: true,
            title: (database as any).title?.[0]?.plain_text,
            properties,
        });
    } catch (error: any) {
        console.error("Database schema error:", error);
        return NextResponse.json(
            { ok: false, error: error.message, code: error.code, body: error.body },
            { status: 500 }
        );
    }
}
