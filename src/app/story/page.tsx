"use client";
import React, { useEffect, useRef, useState } from "react";
import StoryCard from "../components/StoryCard";
import Navbar from "../components/Navbar";
import Socialbar from "../components/Socialbar";

interface Story {
    year: string;
    content: string;
    title: string;
    image: string;
}

export default function Storyboard() {
    const [stories, setStories] = useState<Record<string, Story>>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const [offsetY, setOffsetY] = useState(0);
    const [baseOffsetY, setBaseOffsetY] = useState(0);

    const angleDeg = 20;
    const angleRad = (angleDeg * Math.PI) / 180;
    const cardDistance = 600;

    const horizontalSpacing = cardDistance * Math.cos(angleRad);
    const verticalSpacing = cardDistance * Math.sin(angleRad);
    const slope = verticalSpacing / horizontalSpacing; // vertical movement per horizontal scroll

    useEffect(() => {
        setBaseOffsetY(window.innerHeight * 0.3);
        const handleScroll = () => {
            const scrollLeft = containerRef.current?.scrollLeft || 0;
            setOffsetY(scrollLeft * slope);
        };

        const container = containerRef.current;
        container?.addEventListener("scroll", handleScroll);
        return () => container?.removeEventListener("scroll", handleScroll);
    }, [slope]);

    useEffect(() => {
        fetch("/story.json")
            .then((res) => res.json())
            .then((data) => setStories(data));
    }, []);

    const cards = Object.entries(stories);

    return (
        <div className="flex flex-col w-full h-screen p-4 gap-4 md:gap-6">
            <Socialbar />
            <Navbar home={true} />
            <div className="flex flex-col gap-32 md:flex-row h-full md:mr-24 md:ml-24 mb-10">
                <div className="flex flex-col w-full justify-between py-4 mb-6 md:mb-0">
                    <span className="font-tango text-black text-[40pt] md:text-[70pt] text-start leading-none">
                        STORY
                    </span>
                    <div
                        ref={containerRef}
                        className="absolute top-0 left-100 w-[80%] h-full overflow-x-scroll overflow-y-hidden p-24 z-[100]"
                    >
                        <div
                            className="relative p-16"
                            style={{
                                width: cards.length * horizontalSpacing + 1000,
                                height: cards.length * verticalSpacing + 1000, // enough room for vertical offset
                            }}
                        >
                            {cards.length > 1 && (
                                <div>
                                    <div
                                        className="absolute h-[3px] bg-black z-[-1]"
                                        style={{
                                            width: `${
                                                (cards.length - 1) *
                                                    horizontalSpacing +
                                                300
                                            }px`, // + extra padding
                                            top: `${
                                                baseOffsetY + offsetY + 300
                                            }px`, // same vertical starting point as cards
                                            left: `0px`,
                                            transform: `rotate(-${angleDeg}deg)`,
                                            transformOrigin: "top left",
                                        }}
                                    />
                                    <div
                                        className="absolute h-[3px] z-[-1]"
                                        style={{
                                            width: `${
                                                (cards.length - 1) *
                                                    horizontalSpacing +
                                                300
                                            }px`, // + extra padding
                                            top: `${
                                                baseOffsetY + offsetY + 500
                                            }px`, // same vertical starting point as cards
                                            left: `0px`,
                                            transform: `rotate(-${angleDeg}deg)`,
                                            transformOrigin: "top left",
                                        }}
                                    />
                                    <div
                                        className="absolute h-[3px] bg-black z-[-1]"
                                        style={{
                                            width: `${
                                                (cards.length - 1) *
                                                    horizontalSpacing +
                                                300
                                            }px`, // + extra padding
                                            top: `${
                                                baseOffsetY +
                                                offsetY +
                                                300 +
                                                300
                                            }px`, // same vertical starting point as cards
                                            left: `0px`,
                                            transform: `rotate(-${angleDeg}deg)`,
                                            transformOrigin: "top left",
                                        }}
                                    />
                                </div>
                            )}
                            {cards.map(([key, story], i) => (
                                <div
                                    key={key}
                                    className="absolute w-[300px]"
                                    style={{
                                        left: `${i * horizontalSpacing}px`,
                                        top: `${
                                            baseOffsetY -
                                            i * verticalSpacing +
                                            offsetY
                                        }px`,
                                        transition: "left 0.05s linear",
                                    }}
                                >
                                    <StoryCard story={story} />
                                    <span className="font-pixel text-black">
                                        {story.year}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
