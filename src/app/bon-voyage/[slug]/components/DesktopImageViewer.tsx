"use client";
import Image from "next/image";
import type { FolderImage } from "@/app/types/bonvoyage";

interface DesktopImageViewerProps {
    images: FolderImage[];
    currentIndex: number;
    onNavigate: (index: number) => void;
}

export function DesktopImageViewer({
    images,
    currentIndex,
    onNavigate,
}: DesktopImageViewerProps) {
    const currentImage = images[currentIndex];
    const prevImage = currentIndex > 0 ? images[currentIndex - 1] : null;
    const nextImage =
        currentIndex < images.length - 1 ? images[currentIndex + 1] : null;

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

    return (
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
    );
}
