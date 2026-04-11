"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import type {
    BonVoyageFolder,
    FolderImage,
    FolderDetailResponse,
} from "@/app/types/bonvoyage";
import { ImageCard } from "./components/ImageCard";
import { ImageViewer } from "./components/ImageViewer";

// Map of country codes to flag emoji or image paths
const FLAGS: Record<string, string> = {
    AT: "/bonvoyage/flags/at.png", // Austria
    US: "/bonvoyage/flags/us.png",
    FR: "/bonvoyage/flags/fr.png",
    IT: "/bonvoyage/flags/it.png",
    DE: "/bonvoyage/flags/de.png",
    ES: "/bonvoyage/flags/es.png",
    UK: "/bonvoyage/flags/uk.png",
    JP: "/bonvoyage/flags/jp.png",
};

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const month = date.toLocaleString("en-US", { month: "long" }).toUpperCase();
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day} ${year}`;
}

export default function FolderPage() {
    const params = useParams();
    const slug = params.slug as string;
    const searchParams = useSearchParams();
    const router = useRouter();

    const [folder, setFolder] = useState<BonVoyageFolder | null>(null);
    const [images, setImages] = useState<FolderImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize from URL query param
    const imageParam = searchParams.get("image");
    const initialIndex = imageParam ? parseInt(imageParam, 10) : null;
    const [selectedIndex, setSelectedIndex] = useState<number | null>(
        initialIndex !== null && !isNaN(initialIndex) ? initialIndex : null,
    );

    // Mobile tap preview state
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);
    const [canHover, setCanHover] = useState(true);

    // Detect hover capability (desktop vs mobile)
    useEffect(() => {
        const mediaQuery = window.matchMedia("(hover: hover)");
        setCanHover(mediaQuery.matches);
        const handler = (e: MediaQueryListEvent) => setCanHover(e.matches);
        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    }, []);

    // Sync state to URL
    const selectImage = useCallback(
        (index: number | null) => {
            setSelectedIndex(index);
            if (index !== null) {
                router.replace(`/bon-voyage/${slug}?image=${index}`, {
                    scroll: false,
                });
            } else {
                router.replace(`/bon-voyage/${slug}`, { scroll: false });
            }
        },
        [router, slug],
    );

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (selectedIndex === null) return;

            if (e.key === "ArrowLeft" && selectedIndex > 0) {
                selectImage(selectedIndex - 1);
            } else if (
                e.key === "ArrowRight" &&
                selectedIndex < images.length - 1
            ) {
                selectImage(selectedIndex + 1);
            } else if (e.key === "Escape") {
                selectImage(null);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedIndex, images.length, selectImage]);

    useEffect(() => {
        async function fetchFolder() {
            try {
                const response = await fetch(`/api/drive/folders/${slug}`);
                const data: FolderDetailResponse = await response.json();

                if (data.ok && data.data) {
                    setFolder(data.data.folder);
                    setImages(data.data.images);
                } else {
                    setError(data.error || "Failed to fetch folder");
                }
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to fetch folder",
                );
            } finally {
                setLoading(false);
            }
        }

        if (slug) {
            fetchFolder();
        }
    }, [slug]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="font-pixel text-sm text-black">LOADING...</div>
            </div>
        );
    }

    if (error || !folder) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <div className="font-pixel text-xl text-red-600">
                    {error || "Folder not found"}
                </div>
                <Link
                    href="/bon-voyage"
                    className="font-pixel text-blue-600 underline"
                >
                    BACK
                </Link>
            </div>
        );
    }

    const flagPath = folder.countryCode ? FLAGS[folder.countryCode] : null;

    return (
        <div className="flex items-center justify-center min-h-screen p-8">
            <div className="w-full max-w-[1200px] border-2 border-black bg-neutral-200 shadow-[8px_8px_0_0_rgba(0,0,0,0.3)]">
                {/* Title Bar */}
                <div className="flex items-center justify-between bg-black pr-3">
                    <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 pb-1 min-w-0 flex-1">
                        {flagPath && (
                            <Image
                                src={flagPath}
                                width={32}
                                height={20}
                                alt={folder.countryCode || ""}
                                className="border border-white flex-shrink-0"
                            />
                        )}
                        <h1 className="font-pixel text-white text-title-fluid tracking-wide truncate">
                            {folder.name.toUpperCase()}
                        </h1>
                    </div>
                    <div className="flex gap-2 items-center flex-shrink-0">
                        {selectedIndex !== null &&
                        selectedIndex >= 0 &&
                        selectedIndex < images.length ? (
                            <button
                                onClick={() => selectImage(null)}
                                className="font-pixel text-xs text-black border border-black px-2 pt-2 mb-0 bg-neutral-200 hover:bg-pink-300 transition-colors"
                            >
                                BACK
                            </button>
                        ) : null}
                        <div className="w-6 h-6 bg-neutral-200 border border-black flex items-center justify-center">
                            <Link
                                href="/bon-voyage"
                                className="font-pixel text-black text-sm mt-2 ml-1"
                            >
                                {"x"}
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Date Subtitle */}
                <div className="bg-neutral-200 items-center p-4 pb-2 border-black">
                    <span className="font-pixel text-sm text-black">
                        {formatDate(folder.createdTime)}
                    </span>{" "}
                    {/* <span className="font-pixel text-[11px] text-gray-400">
                        | TAP TWICE FOR FULL VIEW
                    </span> */}
                </div>

                {/* Content Area */}
                <div className="bg-white min-h-[500px] border-2 border-black m-2">
                    {images.length === 0 ? (
                        <div className="font-pixel text-neutral-500 text-center p-10">
                            NO IMAGES YET, SO SORRY
                        </div>
                    ) : selectedIndex !== null &&
                      selectedIndex >= 0 &&
                      selectedIndex < images.length ? (
                        <ImageViewer
                            images={images}
                            currentIndex={selectedIndex}
                            onClose={() => selectImage(null)}
                            onNavigate={selectImage}
                        />
                    ) : (
                        <div className="flex flex-wrap gap-4 p-4 w-full">
                            {images.map((image, index) => (
                                <ImageCard
                                    key={image.id}
                                    image={image}
                                    onClick={() => selectImage(index)}
                                    isPreviewActive={
                                        !canHover && previewIndex === index
                                    }
                                    onPreviewChange={(active) => {
                                        if (canHover) {
                                            // Desktop: click selects immediately
                                            selectImage(index);
                                        } else {
                                            // Mobile: manage preview state
                                            setPreviewIndex(
                                                active ? index : null,
                                            );
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
