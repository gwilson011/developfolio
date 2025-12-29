// src/components/Navbar.tsx
"use client";
import Link from "next/link";
import React from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface NavbarProps {
    setHover?: (hover: string) => void; // Now setHover && setHover takes a string
}

const Navbar: React.FC<NavbarProps> = ({ setHover }) => {
    const pathname = usePathname();
    const shouldShowHome = pathname !== "/";
    return (
        <nav className="">
            <div className="container mx-auto flex items-center">
                <div className="flex flex-row flex-wrap gap-2 text-[8pt] leading-none">
                    {shouldShowHome && (
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
                        href="/under-construction" //story
                        className="flex items-center justify-center pt-3 pb-1 px-3 bg-white border-default text-black font-pixel hover:text-white hover:bg-black"
                        onMouseEnter={() => setHover && setHover("story")}
                        onMouseLeave={() => setHover && setHover("")}
                    >
                        STORY
                    </Link>
                    <Link
                        href="/skills"
                        className="flex items-center justify-center pt-3 pb-1 px-3 bg-white border-default text-black font-pixel hover:text-white hover:bg-black"
                        onMouseEnter={() => setHover && setHover("skills")}
                        onMouseLeave={() => setHover && setHover("")}
                    >
                        SKILLS
                    </Link>
                    <Link
                        href="/projects"
                        className="flex items-center justify-center pt-3 pb-1 px-3 bg-white border-default text-black font-pixel hover:text-white hover:bg-black"
                        onMouseEnter={() => setHover && setHover("projects")}
                        onMouseLeave={() => setHover && setHover("")}
                    >
                        PROJECTS
                    </Link>
                    <Link
                        href="/resume"
                        className="flex items-center justify-center pt-3 pb-1 px-3 bg-white border-default text-black font-pixel hover:text-white hover:bg-black"
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
