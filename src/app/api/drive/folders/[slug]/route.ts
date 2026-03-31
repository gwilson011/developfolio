import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import type { BonVoyageData, FolderDetailResponse } from "@/app/types/bonvoyage";

const DATA_FILE_PATH = path.join(process.cwd(), "src/data/bonvoyage-folders.json");

async function readDataFile(): Promise<BonVoyageData> {
    try {
        const data = await fs.readFile(DATA_FILE_PATH, "utf-8");
        return JSON.parse(data);
    } catch {
        return { folders: {}, lastSynced: "" };
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse<FolderDetailResponse>> {
    try {
        const { slug } = await params;
        const existingData = await readDataFile();

        // Find folder by slug
        const folder = Object.values(existingData.folders).find(
            (f) => f.slug === slug
        );

        if (!folder) {
            return NextResponse.json({
                ok: false,
                error: "Folder not found",
            }, { status: 404 });
        }

        // Return cached data - images are already synced
        return NextResponse.json({
            ok: true,
            data: {
                folder,
                images: folder.images || [],
            },
        });
    } catch (error) {
        console.error("Folder detail error:", error);
        return NextResponse.json({
            ok: false,
            error: error instanceof Error ? error.message : "Unknown error",
        }, { status: 500 });
    }
}
