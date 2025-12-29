"use client";
import React, { useEffect, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import Socialbar from "../components/Socialbar";
import StoryCard from "../components/StoryCard";

interface Story {
    year: string;
    content: string;
    title: string;
    image: string;
}

export default function Storyboard() {
    const [stories, setStories] = React.useState<Record<string, Story>>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const [offsetX, setOffsetX] = useState(0);
    const [horizontalSpacing, setHorizontalSpacing] = useState<number>(0);
    const [verticalSpacing, setVerticalSpacing] = useState<number>(0);

    // useEffect(() => {
    //     const container = containerRef.current;
    //     if (!container) return;

    //     const handleScroll = () => {
    //         const cards = container.getElementsByClassName("story-card");
    //         const scrollX = container.scrollLeft;

    //         // Array.from(cards).forEach((card, i) => {
    //         //     const offset = scrollX; // Adjust 300 and 100 to control wave frequency and amplitude
    //         //     console.log(offset);
    //         //     (
    //         //         card as HTMLElement
    //         //     ).style.transform = `translateY(${offset}px)`;
    //         // });
    //         console.log(scrollX);
    //     };

    //     container.addEventListener("scroll", handleScroll);
    //     return () => container.removeEventListener("scroll", handleScroll);
    // }, []);

    useEffect(() => {}, []);

    useEffect(() => {
        const angleDeg = 20;
        const angleRad = (angleDeg * Math.PI) / 180;
        const slope = Math.tan(angleRad);
        const distance = 400; // distance between cards along the slope
        setHorizontalSpacing(distance * Math.cos(angleRad));
        setVerticalSpacing(distance * Math.sin(angleRad));

        const handleScroll = () => {
            const scrollLeft = containerRef.current?.scrollLeft || 0;
            setOffsetX(scrollLeft * slope);
        };

        const container = containerRef.current;
        container?.addEventListener("scroll", handleScroll);
        return () => container?.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        fetch("/story.json")
            .then((res) => res.json())
            .then((data) => setStories(data));
    }, []);

    return (
        <div className="flex flex-col w-full h-screen p-4 gap-4 md:gap-6">
            <Socialbar />
            <Navbar />
            <div className="flex flex-col gap-32 md:flex-row h-full md:mr-24 md:ml-24 mb-10">
                <div className="flex flex-col w-full justify-between py-4 mb-6 md:mb-0">
                    <span className="font-tango text-black text-[40pt] md:text-[70pt] text-start leading-none">
                        STORY
                    </span>
                    <div
                        ref={containerRef}
                        className="relative flex h-full bg-blue-100 gap-24 mt-[-150px] overflow-x-scroll overflow-y-hidden"
                    >
                        <div className="absolute top-[75%] left-0 h-[3px] bg-black transform rotate-[-15deg] origin-left z-[-1]" />

                        {Object.entries(stories).map(([key, story], i) => (
                            <div
                                key={key}
                                className="story-card relative flex flex-col items-center min-w-[300px]"
                                style={{
                                    transform: `translate(${
                                        i * horizontalSpacing - offsetX
                                    }px, ${-i * verticalSpacing}px)`,
                                }}
                            >
                                <div
                                    className={`flex flex-col items-center gap-5 ${
                                        i % 2 === 0 ? "order-1" : "order-2"
                                    }`}
                                >
                                    {i % 2 === 0 ? (
                                        <>
                                            <StoryCard story={story} />
                                            <span className="flex items-center font-pixel text-lg text-black justify-center h-[40px]">
                                                {story.year}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="flex items-center font-pixel text-lg text-black justify-center h-[40px]">
                                                {story.year}
                                            </span>
                                            <StoryCard story={story} />
                                        </>
                                    )}
                                </div>
                                {/* Empty div for spacing on opposite side */}
                                <div
                                    className={`h-[200px] ${
                                        i % 2 === 0 ? "order-2" : "order-1"
                                    }`}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
