"use client";
import React, { useEffect } from "react";
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

    useEffect(() => {
        fetch("/story.json")
            .then((res) => res.json())
            .then((data) => setStories(data));
    }, []);

    return (
        <div className="flex flex-col w-full h-screen p-4 gap-4 md:gap-6">
            <Socialbar />
            <Navbar home={true} />
            <div className="flex flex-col gap-32 md:flex-row h-full md:mr-24 md:ml-24 mb-10">
                <div className="flex flex-col w-full justify-between py-4 mb-6 md:mb-0">
                    <span className="font-tango text-black text-[40pt] md:text-[70pt] text-start leading-none">
                        STORY
                    </span>
                    <div className="relative flex h-full gap-24 overflow-auto py-32">
                        {/* Timeline line */}
                        <div
                            className="absolute top-[50%] left-[-100px] h-[3px] bg-black"
                            style={{
                                width: `calc(${
                                    Object.keys(stories).length * 324 + 800
                                }px)`,
                            }}
                        />

                        {Object.entries(stories).map(([key, story], i) => (
                            <div
                                key={key}
                                className="relative flex flex-col items-center min-w-[300px]"
                            >
                                <div
                                    className={`flex flex-col items-center gap-5 ${
                                        i % 2 === 0 ? "order-1" : "order-2"
                                    }`}
                                >
                                    {i % 2 === 0 ? (
                                        <>
                                            <StoryCard
                                                story={story}
                                                // className="w-[250px] min-h-[150px] overflow-hidden"
                                            />
                                            <span className="flex font-pixel text-lg text-black justify-center h-[40px]">
                                                {story.year}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="flex font-pixel text-lg text-black justify-center h-[40px]">
                                                {story.year}
                                            </span>
                                            <StoryCard
                                                story={{
                                                    ...story,
                                                }}
                                                // className="w-[250px] min-h-[150px] overflow-hidden"
                                            />
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
