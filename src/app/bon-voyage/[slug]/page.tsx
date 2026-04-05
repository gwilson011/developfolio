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

function ImageViewer({
    images,
    currentIndex,
    onClose,
    onNavigate,
}: {
    images: FolderImage[];
    currentIndex: number;
    onClose: () => void;
    onNavigate: (index: number) => void;
}) {
    const currentImage = images[currentIndex];
    const prevImage = currentIndex > 0 ? images[currentIndex - 1] : null;
    const nextImage =
        currentIndex < images.length - 1 ? images[currentIndex + 1] : null;

    // Touch state for swipe gestures
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    // Minimum swipe distance to trigger navigation (in pixels)
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && currentIndex < images.length - 1) {
            onNavigate(currentIndex + 1);
        }
        if (isRightSwipe && currentIndex > 0) {
            onNavigate(currentIndex - 1);
        }
    };

    const goToPrev = () => {
        if (currentIndex > 0) {
            onNavigate(currentIndex - 1);
        }
    };

    const goToNext = () => {
        if (currentIndex < images.length - 1) {
            onNavigate(currentIndex + 1);
        }
    };

    // Calculate visible thumbnails for mobile strip (centered on current, no empty frames)
    const getVisibleThumbnails = () => {
        const result = [];
        for (let i = currentIndex - 2; i <= currentIndex + 2; i++) {
            if (i >= 0 && i < images.length) {
                result.push({
                    index: i,
                    image: images[i],
                    isCurrent: i === currentIndex,
                });
            }
        }
        return result;
    };

    return (
        <div className="flex flex-col items-center justify-center py-4 gap-2">
            {/* Mobile thumbnail strip (hidden on md+) */}
            <div className="flex justify-center gap-2 md:hidden mb-4">
                {getVisibleThumbnails().map((item, idx) => (
                    <div
                        key={idx}
                        className={`w-[60px] h-[60px] overflow-hidden ${
                            item.isCurrent
                                ? "border-2 border-pink-400"
                                : item.image
                                  ? "border-2 border-black cursor-pointer opacity-50 hover:opacity-75 transition-opacity"
                                  : "border-2 border-neutral-300 bg-neutral-50"
                        }`}
                        onClick={() =>
                            item.image &&
                            !item.isCurrent &&
                            onNavigate(item.index)
                        }
                    >
                        {item.image && (
                            <Image
                                src={item.image.url}
                                width={60}
                                height={60}
                                alt={item.image.name}
                                className="w-full h-full object-cover"
                                unoptimized
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Mobile main image (hidden on md+) */}
            <div
                className="md:hidden w-full px-2"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <div className="font-pixel text-xs text-neutral-500 pb-2 text-center">
                    {currentIndex + 1} / {images.length}
                </div>
                <div className="border-2 border-black overflow-hidden w-full">
                    <Image
                        src={currentImage.url}
                        width={500}
                        height={500}
                        alt={currentImage.name}
                        className="w-full h-auto object-contain"
                        unoptimized
                    />
                </div>
            </div>

            {/* Desktop layout (hidden on mobile, shown on md+) */}
            <div className="hidden md:flex items-center justify-center gap-4 w-full">
                {/* Previous thumbnail */}
                <div className="w-[100px] h-[100px] flex-shrink-0">
                    {prevImage && (
                        <div
                            className="w-full h-full border-2 border-black overflow-hidden opacity-50 hover:opacity-75 cursor-pointer transition-opacity"
                            onClick={goToPrev}
                        >
                            <Image
                                src={prevImage.url}
                                width={100}
                                height={100}
                                alt={prevImage.name}
                                className="w-full h-full object-cover"
                                unoptimized
                            />
                        </div>
                    )}
                </div>

                {/* Previous arrow */}
                <button
                    onClick={goToPrev}
                    disabled={currentIndex === 0}
                    className={`font-pixel text-3xl px-2 ${
                        currentIndex === 0
                            ? "text-neutral-300 cursor-not-allowed"
                            : "text-black hover:text-pink-500 cursor-pointer"
                    }`}
                >
                    {"<"}
                </button>

                {/* Main image */}
                <div className="flex flex-col items-center p-4">
                    {/* Image counter */}
                    <div className="font-pixel text-xs text-neutral-500 pb-2">
                        {currentIndex + 1} / {images.length}
                    </div>
                    <div className="border-2 border-black overflow-hidden max-w-[500px] max-h-[500px]">
                        <Image
                            src={currentImage.url}
                            width={500}
                            height={500}
                            alt={currentImage.name}
                            className="w-full h-full object-contain"
                            unoptimized
                        />
                    </div>
                </div>

                {/* Next arrow */}
                <button
                    onClick={goToNext}
                    disabled={currentIndex === images.length - 1}
                    className={`font-pixel text-3xl px-2 ${
                        currentIndex === images.length - 1
                            ? "text-neutral-300 cursor-not-allowed"
                            : "text-black hover:text-pink-500 cursor-pointer"
                    }`}
                >
                    {">"}
                </button>

                {/* Next thumbnail */}
                <div className="w-[100px] h-[100px] flex-shrink-0">
                    {nextImage && (
                        <div
                            className="w-full h-full border-2 border-black overflow-hidden opacity-50 hover:opacity-75 cursor-pointer transition-opacity"
                            onClick={goToNext}
                        >
                            <Image
                                src={nextImage.url}
                                width={100}
                                height={100}
                                alt={nextImage.name}
                                className="w-full h-full object-cover"
                                unoptimized
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Caption (shared for both layouts) */}
            <div className="flex items-center justify-center gap-4 text-black w-full h-full border-t-2 border-black">
                <div className="mt-4 font-louis text-sm text-center max-w-[500px] px-4">
                    {currentImage.caption || currentImage.name}
                </div>
            </div>
        </div>
    );
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
                    <div className="flex items-center gap-3 p-4 pb-1">
                        {flagPath && (
                            <Image
                                src={flagPath}
                                width={32}
                                height={20}
                                alt={folder.countryCode || ""}
                                className="border border-white"
                            />
                        )}
                        <h1 className="font-pixel text-white text-md tracking-wide">
                            {folder.name.toUpperCase()}
                        </h1>
                    </div>
                    <div className="flex gap-2 items-center">
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
                    </span>
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
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
