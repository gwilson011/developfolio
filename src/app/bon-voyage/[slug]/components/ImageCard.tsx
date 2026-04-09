"use client";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import type { FolderImage } from "@/app/types/bonvoyage";

export function ImageCard({
    image,
    onClick,
    isPreviewActive,
    onPreviewChange,
}: {
    image: FolderImage;
    onClick?: () => void;
    isPreviewActive?: boolean;
    onPreviewChange?: (active: boolean) => void;
}) {
    const [isHovered, setIsHovered] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [popupOnLeft, setPopupOnLeft] = useState(false);

    // Show popup if hovered (desktop) OR preview active (mobile)
    const showPopup = isHovered || isPreviewActive;

    // Calculate position when popup becomes visible
    useEffect(() => {
        if (showPopup && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            // Use actual popup widths: 130px on mobile, 400px on desktop (md: 768px+)
            const popupWidth = window.innerWidth >= 768 ? 400 : 130;
            const spaceOnRight = window.innerWidth - rect.right;
            setPopupOnLeft(spaceOnRight < popupWidth);
        }
    }, [showPopup]);

    const handleClick = () => {
        if (isPreviewActive) {
            // Second tap: deactivate preview and select
            onPreviewChange?.(false);
            onClick?.();
        } else {
            // First tap: activate preview (mobile)
            onPreviewChange?.(true);
        }
    };

    return (
        <div
            ref={containerRef}
            className="relative cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
        >
            <div className="relative w-[130px] h-[130px] md:w-[170px] md:h-[170px] border-2 border-black overflow-hidden">
                <Image
                    src={image.url}
                    alt={image.name}
                    fill
                    className="object-cover"
                />
            </div>

            {showPopup && (
                <div
                    className={`absolute top-0 z-10 bg-pink-300 border-2 border-black px-3 py-2 text-black font-louis text-sm w-[130px] max-h-[100vh] md:max-h-[170px] md:w-[400px] ${
                        popupOnLeft ? "right-full mr-2" : "left-full ml-2"
                    }`}
                >
                    {image.caption || image.name}
                </div>
            )}
        </div>
    );
}
