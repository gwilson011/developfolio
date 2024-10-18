// src/components/Navbar.tsx
"use client";
import Link from "next/link";
import React, { SetStateAction } from "react";
import { useState } from "react";

const Navbar = ({ home = true, setHover }) => {
    return (
        <nav className="">
            <div className="container mx-auto flex items-center">
                <div className="flex flex-row gap-2 text-[8pt] leading-none">
                    {home && (
                        <Link
                            href="/"
                            className="flex p-2 px-3 bg-white border-default text-black font-pixel hover:text-white hover:bg-black"
                        >
                            H
                        </Link>
                    )}
                    <Link
                        href="/"
                        className="flex p-2 px-3 bg-white border-default text-black font-pixel hover:text-white hover:bg-black"
                        onMouseEnter={() => setHover("story")}
                        onMouseLeave={() => setHover("")}
                    >
                        STORY
                    </Link>
                    <Link
                        href="/"
                        className="flex p-2 px-3 bg-white border-default text-black font-pixel hover:text-white hover:bg-black"
                        onMouseEnter={() => setHover("skills")}
                        onMouseLeave={() => setHover("")}
                    >
                        SKILLS
                    </Link>
                    <Link
                        href="/"
                        className="flex p-2 px-3 bg-white border-default text-black font-pixel hover:text-white hover:bg-black"
                        onMouseEnter={() => setHover("projects")}
                        onMouseLeave={() => setHover("")}
                    >
                        PROJECTS
                    </Link>
                    <Link
                        href="/"
                        className="flex p-2 px-3 bg-white border-default text-black font-pixel hover:text-white hover:bg-black"
                        onMouseEnter={() => setHover("resume")}
                        onMouseLeave={() => setHover("")}
                    >
                        RESUME
                    </Link>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
