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

    return (
        <div
            className="relative cursor-pointer"
            onMouseEnter={() => {
                setIsHovered(true);
            }}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
        >
            <div className="w-[170px] h-[170px] border-2 border-black overflow-hidden hover:border-pink-400 transition-colors">
                <Image
                    src={image.url}
                    width={170}
                    height={170}
                    alt={image.name}
                    className="w-full h-full object-cover"
                    unoptimized
                    loading="lazy"
                />
            </div>
            {isHovered && (
                <div className="absolute top-0 left-full ml-2 z-10 bg-pink-300 border-2 border-black px-3 py-2 max-w-[200px] font-louis text-sm whitespace-pre-wrap">
                    {image.caption || image.name}
                </div>
            )}
        </div>
    );
}
