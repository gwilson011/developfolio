"use client";
import Navbar from "./components/Navbar";
import Socialbar from "./components/Socialbar";
import React from "react";
import { useState } from "react";
import Image from "next/image";

export default function Home() {
    const [hover, setHover] = useState<string>("");
    return (
        <div className="flex flex-col w-full h-screen p-4">
            <Socialbar />
            <div className="flex flex-col md:flex-row w-full h-full">
                <div className="flex w-full h-full justify-center md:justify-end mb-10">
                    <div className="relative w-[120px] h-[120px] mt-[235px] md:mr-[70px]">
                        <Image
                            src="/me.jpg"
                            alt="Grace's portrait"
                            fill
                            className="rounded-full object-cover scale-150"
                        />
                    </div>
                </div>
                <div className="flex flex-col w-full h-full justify-center">
                    <div className="flex flex-col gap-2">
                        <span className="font-pixel text-black text-[10pt] text-start leading-none">
                            PROGRAMMER
                        </span>
                        <span className="font-tango text-black text-[70pt] text-start leading-none">
                            GRACE
                        </span>
                        <Navbar setHover={setHover} home={false} />
                    </div>
                    <footer className="flex flex-col w-full h-[20%] justify-center text-black">
                        <div className="font-louis text-[15pt]">
                            {hover == "story" && (
                                <span>Learn how Grace came to be.</span>
                            )}
                            {hover == "skills" && (
                                <span>Check out Grace&apos;s stats.</span>
                            )}
                            {hover == "projects" && (
                                <span>See what Grace has built.</span>
                            )}
                            {hover == "resume" && (
                                <span>All in one place.</span>
                            )}
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
}
