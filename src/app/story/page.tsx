"use client";
import React, { useEffect, useRef, useState } from "react";
import StoryCard from "../components/StoryCard";
import Navbar from "../components/Navbar";
import Image from "next/image";
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
    // const [scrollLeft, setScrollLeft] = useState(0);

    const angleDeg = 20;
    const angleRad = (angleDeg * Math.PI) / 180;
    const cardDistance = 600;
    // const halfViewportWidth =
    //     typeof window !== "undefined" ? window.innerWidth / 2 : 0;

    const horizontalSpacing = cardDistance * Math.cos(angleRad);
    const verticalSpacing = cardDistance * Math.sin(angleRad);
    const slope = verticalSpacing / horizontalSpacing; // vertical movement per horizontal scroll

    useEffect(() => {
        setBaseOffsetY(window.innerHeight * 0.3);
        const handleScroll = () => {
            const scrollX = containerRef.current?.scrollLeft || 0;
            //setScrollLeft(scrollX);
            setOffsetY(scrollX * slope); // still used elsewhere
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
            {/* <div
                className="fixed h-[3px] bg-black z-[-1]"
                style={{
                    width: "150vw",
                    left: "calc(50vw - 75vw)", // center line in viewport
                    top: `${baseOffsetY - scrollLeft * slope + 32}px`, // follow scroll
                    transform: `rotate(-${angleDeg}deg)`,
                    transformOrigin: "center",
                }}
            /> */}
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
                            {/*Timeline line */}
                            {/* {cards.length > 1 && (
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
                                </div>
                            )} */}
                            {/* Timeline Traveler */}
                            <Image
                                src="/ski_gondola.png"
                                alt="Gondola"
                                className="fixed z-50 pointer-events-none w-20 h-auto"
                                style={{
                                    left: "calc(50vw - 20px)", // fixed centered X
                                    top: `calc(50vh + 17px)`, // fixed centered Y
                                    //transform: `rotate(${-angleDeg + 25}deg)`, // counter-rotate to sit on the slope
                                    transformOrigin: "center",
                                }}
                            />

                            {cards.map(([key, story], i) => {
                                const cardLeft = i * horizontalSpacing;
                                const cardTop =
                                    baseOffsetY - i * verticalSpacing + offsetY;
                                const pointTop = cardTop + 234;
                                const pointLeft = cardLeft + 150;

                                return (
                                    <React.Fragment key={key}>
                                        {/* Timeline Point */}
                                        <div
                                            className="absolute z-[-1] flex flex-col items-center"
                                            style={{
                                                left: `${pointLeft}px`, // center under 300px card
                                                top: `${pointTop}px`, // place below card
                                            }}
                                        >
                                            {/* Dot */}
                                            <div className="w-3 h-3 bg-black rounded-full mb-1" />
                                            {/* Year Label */}
                                            <span className="font-pixel text-sm text-black text-center">
                                                {story.year}
                                            </span>
                                        </div>

                                        {/* Story Card */}
                                        <div
                                            className="absolute w-[300px]"
                                            style={{
                                                left: `${cardLeft}px`,
                                                top: `${cardTop}px`,
                                                transition: "left 0.05s linear",
                                            }}
                                        >
                                            <StoryCard story={story} />
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-50">
                        {/* Your fixed line, or decorations that sit "over" the scene */}
                        <div
                            className="fixed z-[-1] h-[3px] bg-black"
                            style={{
                                width: "200vw", // extra width to cross entire screen on a diagonal
                                left: "-50vw", // center the line so it runs across the whole view
                                top: "calc(50vh + 38px)", // vertically center in screen
                                transform: `rotate(-${angleDeg}deg)`,
                                transformOrigin: "center",
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
