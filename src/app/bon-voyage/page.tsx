"use client";
import Image from "next/image";
import Link from "next/link";
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import type {
    BonVoyageFolder,
    BonVoyageAPIResponse,
} from "@/app/types/bonvoyage";

const PIXELS_PER_TICK = 20;
const TICK_INTERVAL_MS = 500;
const IMAGE_HEIGHT = 350;
const MAC_IMAGE = "/bonvoyage/mac_europe.png";
const ENABLE_REVEAL_ANIMATION = false;

// LocalStorage caching for instant load on return visits
const CACHE_KEY = "bonvoyage-cache";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes (match backend)

function Spinner({ className }: { className?: string }) {
    return (
        <span
            className={`inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin ${className ?? ""}`}
        />
    );
}

interface CachedData {
    current: BonVoyageFolder | null;
    all: BonVoyageFolder[];
    lastSynced: string;
    cachedAt: number;
}

function getCachedData(): CachedData | null {
    if (typeof window === "undefined") return null;
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        const data: CachedData = JSON.parse(cached);
        return data;
    } catch {
        return null;
    }
}

function setCachedData(
    current: BonVoyageFolder | null,
    all: BonVoyageFolder[],
    lastSynced: string,
) {
    if (typeof window === "undefined") return;
    try {
        const data: CachedData = {
            current,
            all,
            lastSynced,
            cachedAt: Date.now(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
        // Ignore localStorage errors
    }
}

function isCacheStale(cachedAt: number): boolean {
    return Date.now() - cachedAt > CACHE_TTL_MS;
}

// Location dot position on the Mac map (percentage-based)
// Adjust these values to move the dot on the map
const LOCATION_DOT_X = 54; // % from left edge
const LOCATION_DOT_Y = 46; // % from top edge
const MOBILE_LOCATION_DOT_X = 54; // % from left edge
const MOBILE_LOCATION_DOT_Y = 39; // % from top edge

function FitText({
    text,
    maxWidth,
    baseFontSize,
    minFontSize = 12,
    className,
}: {
    text: string;
    maxWidth: number;
    baseFontSize: number;
    minFontSize?: number;
    className?: string;
}) {
    const [fontSize, setFontSize] = useState(baseFontSize);
    const textRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const el = textRef.current;
        if (!el) return;

        let size = baseFontSize;
        el.style.fontSize = `${size}pt`;

        while (el.scrollWidth > maxWidth && size > minFontSize) {
            size -= 2;
            el.style.fontSize = `${size}pt`;
        }

        setFontSize(size);
    }, [text, maxWidth, baseFontSize, minFontSize]);

    return (
        <div
            ref={textRef}
            className={className}
            style={{ fontSize: `${fontSize}pt` }}
        >
            {text}
        </div>
    );
}

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

    const fetchFolders = useCallback(
        async (forceSync = false, isBackgroundRefresh = false) => {
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
                    // Cache the response in localStorage
                    setCachedData(
                        data.data.current,
                        data.data.all,
                        data.data.lastSynced,
                    );
                } else if (!isBackgroundRefresh) {
                    setError(data.error || "Failed to fetch folders");
                }
            } catch (err) {
                if (!isBackgroundRefresh) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to fetch folders",
                    );
                }
            } finally {
                setLoading(false);
                setSyncing(false);
            }
        },
        [],
    );

    useEffect(() => {
        // Check localStorage cache first for instant load
        const cached = getCachedData();
        if (cached) {
            setCurrentFolder(cached.current);
            setAllFolders(cached.all);
            setLastSynced(cached.lastSynced);
            setLoading(false);

            // If cache is stale, refresh in background
            if (isCacheStale(cached.cachedAt)) {
                fetchFolders(false, true);
            }
        } else {
            // No cache, fetch from API
            fetchFolders();
        }
    }, [fetchFolders]);

    const handleRefresh = () => {
        if (!syncing) {
            fetchFolders(true);
        }
    };

    // Show animation if enabled by default OR if folder has no images
    const showRevealAnimation =
        ENABLE_REVEAL_ANIMATION || !currentFolder?.images?.length;

    // Animation effect - runs continuously and loops (only when enabled)
    useEffect(() => {
        if (!showRevealAnimation || !currentFolder) return;

        const interval = setInterval(() => {
            setRevealPixels((prev) =>
                prev >= IMAGE_HEIGHT ? 0 : prev + PIXELS_PER_TICK,
            );
        }, TICK_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [currentFolder, showRevealAnimation]);

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
                    className="p-3 pb-1 text-xs text-gray-500 font-pixel border-2 rounded bg-neutral-200 hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                    {syncing ? (
                        <div>
                            <Spinner />
                        </div>
                    ) : (
                        "REFRESH"
                    )}
                </button>
            </div>

            {/* Error display */}
            {error && (
                <div className="text-center text-red-500 font-pixel text-sm px-4">
                    {error}
                </div>
            )}

            {/* Mobile Layout */}
            <div className="md:hidden flex flex-col items-center text-black">
                {/* Hero section: Computer + Featured Floppy */}
                <div className="flex items-center justify-center gap-3 h-full">
                    {/* Computer */}
                    <div className="flex-shrink-0 w-[180px] relative">
                        <Image
                            src={MAC_IMAGE}
                            width={180}
                            height={216}
                            alt="Computer"
                            className="w-full h-auto"
                        />
                        <div
                            className="absolute w-1 h-1 bg-red-500 animate-pulse shadow-[0_0_6px_2px_rgba(239,68,68,0.6)]"
                            style={{
                                left: `${MOBILE_LOCATION_DOT_X}%`,
                                top: `${MOBILE_LOCATION_DOT_Y}%`,
                            }}
                        />
                    </div>

                    {/* Featured folder floppy + text */}
                    <div className="flex flex-col items-center pt-2 h-full">
                        {loading ? (
                            <div className="font-pixel text-sm">LOADING...</div>
                        ) : currentFolder ? (
                            <Link
                                href={`/bon-voyage/${currentFolder.slug}`}
                                className="flex flex-col items-center gap-2 !cursor-pointer"
                            >
                                <div className="relative w-[105px] h-[105px] cursor-pointer">
                                    {showRevealAnimation ? (
                                        <>
                                            {/* Base layer at 30% opacity */}
                                            <Image
                                                src={currentFolder.floppyImage}
                                                width={105}
                                                height={105}
                                                alt="LOADING..."
                                                className="absolute inset-0 opacity-30 w-full h-full object-contain"
                                                style={{ cursor: "pointer" }}
                                            />
                                            {/* Colored layer with clip-path reveal */}
                                            <Image
                                                src={currentFolder.floppyImage}
                                                width={105}
                                                height={105}
                                                alt={currentFolder.name}
                                                className="absolute inset-0 w-full h-full object-contain"
                                                style={{
                                                    cursor: "pointer",
                                                    clipPath: `inset(${((IMAGE_HEIGHT - revealPixels) / IMAGE_HEIGHT) * 100}% 0 0 0)`,
                                                }}
                                            />
                                        </>
                                    ) : (
                                        <Image
                                            src={currentFolder.floppyImage}
                                            width={105}
                                            height={105}
                                            alt={currentFolder.name}
                                            className="w-full h-full object-contain"
                                            style={{ cursor: "pointer" }}
                                        />
                                    )}
                                </div>
                                <FitText
                                    text={currentFolder.name.toUpperCase()}
                                    maxWidth={150}
                                    baseFontSize={28}
                                    minFontSize={16}
                                    className="font-tango leading-none text-center mt-1"
                                />
                                {currentFolder.subtitle && (
                                    <div className="font-pixel text-xs text-center">
                                        {currentFolder.subtitle.toUpperCase()}
                                    </div>
                                )}
                            </Link>
                        ) : (
                            <div className="font-pixel text-center">
                                <div className="text-sm">NO FOLDERS</div>
                                {lastSynced && (
                                    <div className="text-xs text-gray-400 mt-2">
                                        Last synced:{" "}
                                        {formatTimeSince(lastSynced)}
                                    </div>
                                )}
                                <button
                                    onClick={handleRefresh}
                                    disabled={syncing}
                                    className="mt-4 px-4 py-2 text-xs border-2 rounded bg-neutral-200 hover:bg-neutral-300 disabled:opacity-50"
                                >
                                    {syncing ? "SYNCING..." : "TRY AGAIN"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Grid of other folders (3 columns) - centered */}
                <div className="flex justify-center w-full mt-6">
                    <div className="grid grid-cols-3 gap-x-4 gap-y-4 ml-[-25px]">
                        {allFolders.slice(1).map((folder) => (
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
                                    style={{ cursor: "pointer" }}
                                />
                                <span className="text-xs font-pixel pt-2 text-center w-[85px] leading-tight truncate">
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
                    {/* Left: Computer */}
                    <div className="w-[320px] h-[384px] relative">
                        <Image
                            src={MAC_IMAGE}
                            width={320}
                            height={384}
                            alt="Computer"
                        />
                        <div
                            className="absolute w-1 h-1 bg-red-500 animate-pulse shadow-[0_0_8px_3px_rgba(239,68,68,0.6)]"
                            style={{
                                left: `${LOCATION_DOT_X}%`,
                                top: `${LOCATION_DOT_Y}%`,
                            }}
                        />
                    </div>

                    {/* Right: Featured floppy + text on top, smaller floppies below */}
                    <div className="flex flex-col justify-end gap-12 h-[384px]">
                        {/* Featured floppy + text */}
                        {loading ? (
                            <div className="font-pixel">LOADING...</div>
                        ) : currentFolder ? (
                            <Link
                                href={`/bon-voyage/${currentFolder.slug}`}
                                className="flex items-center gap-4 !cursor-pointer"
                            >
                                <div className="relative w-[140px] h-[140px] cursor-pointer">
                                    {showRevealAnimation ? (
                                        <>
                                            <Image
                                                src={currentFolder.floppyImage}
                                                width={140}
                                                height={140}
                                                alt="LOADING..."
                                                className="absolute inset-0 opacity-30"
                                                style={{ cursor: "pointer" }}
                                            />
                                            <Image
                                                src={currentFolder.floppyImage}
                                                width={140}
                                                height={140}
                                                alt={currentFolder.name}
                                                className="absolute inset-0"
                                                style={{
                                                    cursor: "pointer",
                                                    clipPath: `inset(${((IMAGE_HEIGHT - revealPixels) / IMAGE_HEIGHT) * 100}% 0 0 0)`,
                                                }}
                                            />
                                        </>
                                    ) : (
                                        <Image
                                            src={currentFolder.floppyImage}
                                            width={140}
                                            height={140}
                                            alt={currentFolder.name}
                                            style={{ cursor: "pointer" }}
                                        />
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <FitText
                                        text={currentFolder.name.toUpperCase()}
                                        maxWidth={400}
                                        baseFontSize={56}
                                        minFontSize={28}
                                        className="font-tango leading-none"
                                    />
                                    {currentFolder.subtitle && (
                                        <div className="font-pixel text-lg">
                                            {currentFolder.subtitle.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ) : (
                            <div className="font-pixel text-center">
                                <div>NO FOLDERS</div>
                                {lastSynced && (
                                    <div className="text-xs text-gray-400 mt-2">
                                        Last synced:{" "}
                                        {formatTimeSince(lastSynced)}
                                    </div>
                                )}
                                <button
                                    onClick={handleRefresh}
                                    disabled={syncing}
                                    className="mt-4 px-4 py-2 text-xs border-2 rounded bg-neutral-200 hover:bg-neutral-300 disabled:opacity-50"
                                >
                                    {syncing ? "SYNCING..." : "TRY AGAIN"}
                                </button>
                            </div>
                        )}

                        {/* Other folders row - at bottom */}
                        <div className="flex gap-6">
                            {allFolders.slice(1).map((folder) => (
                                <Link
                                    key={folder.id}
                                    href={`/bon-voyage/${folder.slug}`}
                                    className="flex flex-col items-center cursor-pointer hover:opacity-80 gap-2 transition-opacity"
                                >
                                    <Image
                                        src={folder.floppyImage}
                                        width={90}
                                        height={90}
                                        alt={folder.name}
                                        style={{ cursor: "pointer" }}
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
