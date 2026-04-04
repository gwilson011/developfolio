"use client";
import Image from "next/image";
import type { FolderImage } from "@/app/types/bonvoyage";

interface MobileThumbnailStripProps {
    images: FolderImage[];
    currentIndex: number;
    onNavigate: (index: number) => void;
}

export function MobileThumbnailStrip({
    images,
    currentIndex,
    onNavigate,
}: MobileThumbnailStripProps) {
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
        <div className="flex justify-center gap-2 md:hidden mb-4">
            {getVisibleThumbnails().map((item, idx) => (
                <div
                    key={idx}
                    className={`w-[60px] h-[60px] overflow-hidden ${
                        item.isCurrent
                            ? "border-4 border-pink-400"
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
                                                    />
                    )}
                </div>
            ))}
        </div>
    );
}
