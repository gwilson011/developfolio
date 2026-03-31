"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type {
    BonVoyageFolder,
    FolderImage,
    FolderDetailResponse,
} from "@/app/types/bonvoyage";

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

function ImageCard({ image }: { image: FolderImage }) {
    const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(
        null,
    );

    return (
        <div
            className="relative"
            onMouseEnter={(e) => {
                console.log(image);
                setHoverPos({ x: e.clientX, y: e.clientY });
            }}
            onMouseLeave={() => setHoverPos(null)}
        >
            <div className="w-[170px] h-[170px] border-2 border-black overflow-hidden">
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
            {hoverPos && (
                <div
                    className="fixed z-50 bg-pink-300 border-2 text-black border-black px-3 py-2 max-w-[200px] font-louis text-sm whitespace-pre-wrap pointer-events-none"
                    style={{
                        left: hoverPos.x + 12,
                        top: hoverPos.y + 12,
                    }}
                >
                    {image.caption || image.name}
                </div>
            )}
        </div>
    );
}

export default function FolderPage() {
    const params = useParams();
    const slug = params.slug as string;

    const [folder, setFolder] = useState<BonVoyageFolder | null>(null);
    const [images, setImages] = useState<FolderImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchFolder() {
            try {
                const response = await fetch(`/api/drive/folders/${slug}`);
                const data: FolderDetailResponse = await response.json();
                console.log("API response:", data);

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
                    Back to Bon Voyage
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
                    <div className="flex gap-1 text-black w-6 h-6">
                        <div className="w-full h-full bg-neutral-200 border border-black flex items-center justify-center">
                            <Link
                                href="/bon-voyage"
                                className="font-pixel text-black text-sm"
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
                <div className="bg-white p-6 min-h-[500px] border-2 border-black m-2 mt-0">
                    {images.length === 0 ? (
                        <div className="font-pixel text-neutral-500 text-center py-10">
                            NO IMAGES YET, SO SORRY
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-4">
                            {images.map((image) => (
                                <ImageCard key={image.id} image={image} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
