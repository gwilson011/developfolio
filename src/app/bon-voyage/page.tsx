"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type {
    BonVoyageFolder,
    BonVoyageAPIResponse,
} from "@/app/types/bonvoyage";

const PIXELS_PER_TICK = 20;
const TICK_INTERVAL_MS = 500;
const IMAGE_HEIGHT = 350;

function formatTimeSince(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes === 1) return "1 min ago";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "1 hour ago";
    return `${hours} hours ago`;
}

export default function BonVoyage() {
    const [currentFolder, setCurrentFolder] = useState<BonVoyageFolder | null>(
        null,
    );
    const [allFolders, setAllFolders] = useState<BonVoyageFolder[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [revealPixels, setRevealPixels] = useState(0);
    const [lastSynced, setLastSynced] = useState<string | null>(null);

    const fetchFolders = useCallback(async (forceSync = false) => {
        try {
            if (forceSync) {
                setSyncing(true);
            }
            const url = forceSync
                ? "/api/drive/folders?forceSync=true"
                : "/api/drive/folders";
            const response = await fetch(url);
            const data: BonVoyageAPIResponse = await response.json();

            if (data.ok && data.data) {
                setCurrentFolder(data.data.current);
                setAllFolders(data.data.all);
                setLastSynced(data.data.lastSynced);
            } else {
                setError(data.error || "Failed to fetch folders");
            }
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to fetch folders",
            );
        } finally {
            setLoading(false);
            setSyncing(false);
        }
    }, []);

    useEffect(() => {
        fetchFolders();
    }, [fetchFolders]);

    const handleRefresh = () => {
        if (!syncing) {
            fetchFolders(true);
        }
    };

    // Animation effect - runs continuously and loops
    useEffect(() => {
        if (!currentFolder) return;

        const interval = setInterval(() => {
            setRevealPixels((prev) =>
                prev >= IMAGE_HEIGHT ? 0 : prev + PIXELS_PER_TICK,
            );
        }, TICK_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [currentFolder]);

    // Reset animation when folder changes
    useEffect(() => {
        setRevealPixels(0);
    }, [currentFolder?.id]);

    return (
        <div className="flex flex-col w-full h-screen p-4 gap-4 md:gap-6">
            {/* Sync status and refresh button */}
            <div className="flex items-center justify-end gap-3 px-4">
                {lastSynced && (
                    <span className="text-xs text-gray-500 font-pixel pt-2">
                        {syncing
                            ? "SYNCING..."
                            : `SYNCED ${formatTimeSince(lastSynced).toUpperCase()}`}
                    </span>
                )}
                <button
                    onClick={handleRefresh}
                    disabled={syncing}
                    className="p-3 pb-1 text-xs text-gray-500 font-pixel border-2 rounded bg-neutral-200 hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {syncing ? "..." : "REFRESH"}
                </button>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-center flex-1 h-full text-black">
                <div className="relative flex w-[700px] h-[480px] px-[150px]">
                    <Image
                        src="/bonvoyage/mac_1.png"
                        width={400}
                        height={480}
                        alt="Description"
                        className=""
                    />
                    <div className="absolute top-[80px] left-[215px] w-[260px] h-[170px] bg-[#014b34]">
                        <Image
                            src="/bonvoyage/europe_map.png"
                            fill
                            alt="Description"
                            className="object-contain"
                        />
                    </div>
                </div>
                <div className="flex flex-1 flex-col h-full py-[130px]">
                    <div className="flex w-[700px] h-[480px]">
                        <div className="flex flex-col items-center py-10">
                            {loading ? (
                                "Loading..."
                            ) : currentFolder ? (
                                <Link
                                    href={`/bon-voyage/${currentFolder.slug}`}
                                    className="relative w-[200px] h-[200px] block cursor-pointer"
                                >
                                    {/* Base layer at 30% opacity */}
                                    <Image
                                        src={currentFolder.floppyImage}
                                        width={350}
                                        height={350}
                                        alt="Loading..."
                                        className="absolute inset-0 opacity-30"
                                    />
                                    {/* Colored layer with clip-path reveal */}
                                    <Image
                                        src={currentFolder.floppyImage}
                                        width={350}
                                        height={350}
                                        alt={currentFolder.name}
                                        className="absolute inset-0"
                                        style={{
                                            clipPath: `inset(${((IMAGE_HEIGHT - revealPixels) / IMAGE_HEIGHT) * 100}% 0 0 0)`,
                                        }}
                                    />
                                </Link>
                            ) : (
                                "No folders"
                            )}
                        </div>
                        <div className="flex flex-col justify-center p-10">
                            <div className="font-tango text-[65pt]">
                                {loading
                                    ? "Loading..."
                                    : error
                                      ? error
                                      : currentFolder?.name.toUpperCase() ||
                                        "No current folder"}
                            </div>
                            {currentFolder?.subtitle && (
                                <div className="font-pixel text-md">
                                    {currentFolder.subtitle.toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap w-[700px] h-[480px] gap-10 py-10 overflow-auto items-start">
                        {allFolders
                            .slice(1)
                            .reverse()
                            .map((folder) => (
                                <Link
                                    key={folder.id}
                                    href={`/bon-voyage/${folder.slug}`}
                                    className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                    <Image
                                        src={folder.floppyImage}
                                        width={100}
                                        height={100}
                                        alt={folder.name}
                                    />
                                    <span className="text-sm font-pixel py-4 text-center max-w-[100px]">
                                        {folder.name.toUpperCase()}
                                    </span>
                                </Link>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
