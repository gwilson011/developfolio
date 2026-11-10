export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// TEMP DEBUG ROUTE — delete once resolved. Confirms whether Redis reads/
// writes actually succeed in production. Only returns booleans and generic
// error messages (no connection strings, tokens, or cached data content).
export async function GET(): Promise<NextResponse> {
    const redis = new Redis({
        url: process.env.STORAGE_KV_REST_API_URL,
        token: process.env.STORAGE_KV_REST_API_TOKEN,
    });
    const result: {
        envConfigured: boolean;
        writeOk: boolean;
        readOk: boolean;
        readValue: number | null;
        error: string | null;
    } = {
        envConfigured: !!(
            process.env.STORAGE_KV_REST_API_URL &&
            process.env.STORAGE_KV_REST_API_TOKEN
        ),
        writeOk: false,
        readOk: false,
        readValue: null,
        error: null,
    };

    try {
        const testValue = Date.now();
        await redis.set("debug-connectivity-test", testValue, { ex: 60 });
        result.writeOk = true;

        const readBack = await redis.get<number>("debug-connectivity-test");
        result.readOk = true;
        result.readValue = readBack;
    } catch (e) {
        result.error = e instanceof Error ? e.message : String(e);
    }

    return NextResponse.json(result);
}
