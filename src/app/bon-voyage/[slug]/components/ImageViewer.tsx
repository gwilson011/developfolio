"use client";
import Image from "next/image";
import { useState } from "react";
import type { FolderImage } from "@/app/types/bonvoyage";
import { MobileThumbnailStrip } from "./MobileThumbnailStrip";
import { DesktopImageViewer } from "./DesktopImageViewer";

interface ImageViewerProps {
    images: FolderImage[];
    currentIndex: number;
    onClose: () => void;
    onNavigate: (index: number) => void;
}

export function ImageViewer({
    images,
    currentIndex,
    onClose,
    onNavigate,
}: ImageViewerProps) {
    const currentImage = images[currentIndex];

    // Touch state for swipe gestures
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const [isPinching, setIsPinching] = useState(false);

    // Minimum swipe distance to trigger navigation (in pixels)
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length > 1) {
            setIsPinching(true);
            return;
        }
        setIsPinching(false);
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length > 1) {
            setIsPinching(true);
            return;
        }
        if (isPinching) return;
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (isPinching) {
            setIsPinching(false);
            setTouchStart(null);
            setTouchEnd(null);
            return;
        }
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

    return (
        <div className="flex flex-col items-center justify-center py-4 gap-2">
            {/* Mobile thumbnail strip (hidden on md+) */}
            <MobileThumbnailStrip
                images={images}
                currentIndex={currentIndex}
                onNavigate={onNavigate}
            />

            {/* Mobile main image (hidden on md+) */}
            <div
                className="md:hidden w-full px-2"
                style={{ touchAction: 'pan-y pinch-zoom' }}
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
                    />
                </div>
            </div>

            {/* Desktop layout (hidden on mobile, shown on md+) */}
            <DesktopImageViewer
                images={images}
                currentIndex={currentIndex}
                onNavigate={onNavigate}
            />

            {/* Caption (shared for both layouts) */}
            <div className="flex items-center justify-center gap-4 text-black w-full h-full border-t-2 border-black">
                <div className="mt-4 font-louis text-sm text-center max-w-[500px] px-4">
                    {currentImage.caption || currentImage.name}
                </div>
            </div>
        </div>
    );
}
