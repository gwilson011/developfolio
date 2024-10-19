// src/components/Navbar.tsx
"use client";
import Link from "next/link";
import React from "react";
import Image from "next/image";

interface NavbarProps {
    home?: boolean;
    setHover?: (hover: string) => void; // Now setHover && setHover takes a string
}

const Navbar: React.FC<NavbarProps> = ({ home = true, setHover }) => {
    return (
        <nav className="">
            <div className="container mx-auto flex items-center">
                <div className="flex flex-row gap-2 text-[8pt] leading-none">
                    {home && (
                        <Link
                            href="/"
                            className="flex items-center p-1 bg-white border-default text-black font-pixel hover:text-white hover:bg-black"
                        >
                            <Image
                                alt="home"
                                src="/home.png"
                                width={20}
                                height={20}
                            />
                        </Link>
                    )}
                    <Link
                        href="/"
                        className="flex p-2 px-3 bg-white border-default text-black font-pixel hover:text-white hover:bg-black"
                        onMouseEnter={() => setHover && setHover("story")}
                        onMouseLeave={() => setHover && setHover("")}
                    >
                        STORY
                    </Link>
                    <Link
                        href="/skills"
                        className="flex p-2 px-3 bg-white border-default text-black font-pixel hover:text-white hover:bg-black"
                        onMouseEnter={() => setHover && setHover("skills")}
                        onMouseLeave={() => setHover && setHover("")}
                    >
                        SKILLS
                    </Link>
                    <Link
                        href="/"
                        className="flex p-2 px-3 bg-white border-default text-black font-pixel hover:text-white hover:bg-black"
                        onMouseEnter={() => setHover && setHover("projects")}
                        onMouseLeave={() => setHover && setHover("")}
                    >
                        PROJECTS
                    </Link>
                    <Link
                        href="/"
                        className="flex p-2 px-3 bg-white border-default text-black font-pixel hover:text-white hover:bg-black"
                        onMouseEnter={() => setHover && setHover("resume")}
                        onMouseLeave={() => setHover && setHover("")}
                    >
                        RESUME
                    </Link>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
