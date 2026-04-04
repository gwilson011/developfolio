"use client";
import Image from "next/image";
import { useState } from "react";
import type { FolderImage } from "@/app/types/bonvoyage";

export function ImageCard({
    image,
    onClick,
}: {
    image: FolderImage;
    onClick?: () => void;
}) {
    const [isHovered, setIsHovered] = useState(false);

    const handleClick = () => {
        // toggle caption instead of immediate navigation
        if (!isHovered) {
            setIsHovered(true);
        } else {
            setIsHovered(false);
            onClick?.(); // optional: only trigger action on second tap
        }
    };

    return (
        <div
            className="relative cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
        >
            <div className="relative w-[100px] h-[100px] md:w-[170px] md:h-[170px] border-2 border-black overflow-hidden">
                <Image
                    src={image.url}
                    alt={image.name}
                    fill
                    className="object-cover"
                />
            </div>

            {isHovered && (
                <div className="absolute top-0 left-full ml-2 z-10 bg-pink-300 border-2 border-black px-3 py-2 max-w-[200px] text-black font-louis text-sm">
                    {image.caption || image.name}
                </div>
            )}
        </div>
    );
}
