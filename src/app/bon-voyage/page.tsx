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
        <div className="flex flex-col w-full min-h-screen p-2 md:p-4 gap-4 md:gap-6">
            {/* Sync status and refresh button */}
            <div className="flex items-center justify-end gap-3 px-2 md:px-4">
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

            {/* Mobile Layout */}
            <div className="md:hidden flex flex-col items-center text-black">
                {/* Hero section: Computer + Featured Floppy */}
                <div className="flex items-center justify-center gap-3 h-full">
                    {/* Computer with Europe map */}
                    <div className="relative flex-shrink-0 w-[180px]">
                        <Image
                            src="/bonvoyage/mac_1.png"
                            width={180}
                            height={216}
                            alt="Computer"
                            className="w-full h-auto"
                        />
                        {/* Europe map overlay - positioned on the screen */}
                        <div
                            className="absolute"
                            style={{
                                top: "14%",
                                left: "14%",
                                width: "72%",
                                height: "40%",
                            }}
                        >
                            <Image
                                src="/bonvoyage/europe_map.png"
                                fill
                                alt="Europe Map"
                                className="object-cover"
                            />
                        </div>
                    </div>

                    {/* Featured folder floppy + text */}
                    <div className="flex flex-col items-center pt-2 h-full">
                        {loading ? (
                            <div className="font-pixel text-sm">LOADING...</div>
                        ) : currentFolder ? (
                            <Link
                                href={`/bon-voyage/${currentFolder.slug}`}
                                className="flex flex-col items-center gap-2"
                            >
                                <div className="relative w-[105px] h-[105px]">
                                    {/* Base layer at 30% opacity */}
                                    <Image
                                        src={currentFolder.floppyImage}
                                        width={105}
                                        height={105}
                                        alt="LOADING..."
                                        className="absolute inset-0 opacity-30 w-full h-full object-contain"
                                    />
                                    {/* Colored layer with clip-path reveal */}
                                    <Image
                                        src={currentFolder.floppyImage}
                                        width={105}
                                        height={105}
                                        alt={currentFolder.name}
                                        className="absolute inset-0 w-full h-full object-contain"
                                        style={{
                                            clipPath: `inset(${((IMAGE_HEIGHT - revealPixels) / IMAGE_HEIGHT) * 100}% 0 0 0)`,
                                        }}
                                    />
                                </div>
                                <div className="font-tango text-[28pt] leading-none text-center mt-1">
                                    {currentFolder.name.toUpperCase()}
                                </div>
                                {currentFolder.subtitle && (
                                    <div className="font-pixel text-xs text-center">
                                        {currentFolder.subtitle.toUpperCase()}
                                    </div>
                                )}
                            </Link>
                        ) : (
                            <div className="font-pixel text-sm">No folders</div>
                        )}
                    </div>
                </div>

                {/* Grid of other folders (3 columns) - centered */}
                <div className="flex justify-center w-full mt-6">
                    <div className="grid grid-cols-3 gap-x-4 gap-y-4">
                        {allFolders
                            .slice(1)
                            .reverse()
                            .map((folder) => (
                                <Link
                                    key={folder.id}
                                    href={`/bon-voyage/${folder.slug}`}
                                    className="flex flex-col items-center cursor-pointer hover:opacity-80 gap-2 transition-opacity"
                                >
                                    <Image
                                        src={folder.floppyImage}
                                        width={85}
                                        height={85}
                                        alt={folder.name}
                                        className="w-[85px] h-[85px] object-contain"
                                    />
                                    <span className="text-xs font-pixel pt-1 text-center max-w-[85px] leading-tight">
                                        {folder.name.toUpperCase()}
                                    </span>
                                </Link>
                            ))}
                    </div>
                </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex justify-center text-black py-8">
                {/* Two-column layout: Computer left, content right */}
                <div className="flex gap-12">
                    {/* Left: Computer with Europe map */}
                    <div className="relative w-[320px] h-[384px]">
                        <Image
                            src="/bonvoyage/mac_1.png"
                            width={320}
                            height={384}
                            alt="Computer"
                        />
                        <div
                            className="absolute"
                            style={{
                                top: "14%",
                                left: "14%",
                                width: "72%",
                                height: "40%",
                            }}
                        >
                            <Image
                                src="/bonvoyage/europe_map.png"
                                fill
                                alt="Europe Map"
                                className="object-cover"
                            />
                        </div>
                    </div>

                    {/* Right: Featured floppy + text on top, smaller floppies below */}
                    <div className="flex flex-col justify-end gap-12 h-[384px]">
                        {/* Featured floppy + text */}
                        {loading ? (
                            <div className="font-pixel">LOADING...</div>
                        ) : currentFolder ? (
                            <Link
                                href={`/bon-voyage/${currentFolder.slug}`}
                                className="flex items-center gap-4"
                            >
                                <div className="relative w-[140px] h-[140px]">
                                    <Image
                                        src={currentFolder.floppyImage}
                                        width={140}
                                        height={140}
                                        alt="LOADING..."
                                        className="absolute inset-0 opacity-30"
                                    />
                                    <Image
                                        src={currentFolder.floppyImage}
                                        width={140}
                                        height={140}
                                        alt={currentFolder.name}
                                        className="absolute inset-0"
                                        style={{
                                            clipPath: `inset(${((IMAGE_HEIGHT - revealPixels) / IMAGE_HEIGHT) * 100}% 0 0 0)`,
                                        }}
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="font-tango text-[56pt] leading-none">
                                        {currentFolder.name.toUpperCase()}
                                    </div>
                                    {currentFolder.subtitle && (
                                        <div className="font-pixel text-lg">
                                            {currentFolder.subtitle.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ) : (
                            <div className="font-pixel">NO FOLDERS</div>
                        )}

                        {/* Other folders row - at bottom */}
                        <div className="flex gap-6">
                            {allFolders
                                .slice(1)
                                .reverse()
                                .map((folder) => (
                                    <Link
                                        key={folder.id}
                                        href={`/bon-voyage/${folder.slug}`}
                                        className="flex flex-col items-center hover:opacity-80 gap-2 transition-opacity"
                                    >
                                        <Image
                                            src={folder.floppyImage}
                                            width={90}
                                            height={90}
                                            alt={folder.name}
                                        />
                                        <span className="text-sm font-pixel pt-1 text-center">
                                            {folder.name.toUpperCase()}
                                        </span>
                                    </Link>
                                ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
