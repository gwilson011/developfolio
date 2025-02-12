"use client";
import Navbar from "../components/Navbar";
import Socialbar from "../components/Socialbar";
import React, { useState } from "react";
import Image from "next/image";
import Skillbar from "../components/Skillbar";
import skill_data from "./skills.json";

// Add type definition for skill data
interface SkillData {
    [key: string]: {
        level: "INTERMEDIATE" | "BEGINNER" | "ADVANCED";
        projects: string[];
        length: string;
        experience: string[];
    };
}

export default function Skills() {
    const [selected, setSelected] = useState<string>("");
    const [selectedCategory, setSelectedCategory] = useState<string>("");

    const categories = {
        LANGUAGES: ["PYTHON", "JAVASCRIPT", "C++", "SWIFT"],
        FRONTEND: [
            "REACT",
            "TYPESCRIPT",
            "CSS",
            "REDUX",
            "NEXT.JS",
            "SVELTE",
            "REACT NATIVE",
        ],
        BACKEND: ["NODE.JS", "EXPRESS", "POSTGRESQL", "SQL"],
    };

    function findKeyByValue(
        dictionary: { [key: string]: string[] },
        value: string
    ): string | null {
        for (const key in dictionary) {
            if (dictionary[key].includes(value)) {
                return key;
            }
        }
        return null;
    }

    const update = (val: string) => {
        setSelected(val);
        setSelectedCategory(findKeyByValue(categories, val) || "");
    };

    return (
        <div className="flex flex-col w-full h-screen p-4 gap-4 md:gap-6">
            <Socialbar />
            <Navbar home={true} />
            <div className="flex flex-col h-full md:mr-24 md:ml-24 mb-10 gap-8 md:justify-between">
                <span className="font-tango text-black text-[40pt] md:text-[70pt] text-start leading-none">
                    SKILLS
                </span>

                <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-16">
                    <div className="flex flex-col justify-between h-full order-2 md:order-1 md:mb-20">
                        <div className="flex flex-col gap-5 md:mt-16">
                            {Object.entries(categories).map(
                                ([category, skills]) => (
                                    <div
                                        key={category}
                                        className="flex flex-col gap-2"
                                    >
                                        <span className="text-black font-pixel">
                                            {category}
                                        </span>
                                        <div className="grid grid-cols-2 gap-2 md:grid-cols-none md:flex md:flex-wrap">
                                            {skills.map((skill) => (
                                                <button
                                                    key={skill}
                                                    className="border-default text-black p-2 flex flex-row items-center gap-2"
                                                    onClick={() =>
                                                        update(skill)
                                                    }
                                                    style={{
                                                        background:
                                                            selected === skill
                                                                ? "black"
                                                                : "none",
                                                    }}
                                                >
                                                    <Image
                                                        src={`/${skill}.png`}
                                                        width={50}
                                                        height={50}
                                                        alt={skill}
                                                        style={{
                                                            filter:
                                                                selected ===
                                                                skill
                                                                    ? "invert(1)"
                                                                    : "none",
                                                        }}
                                                    />
                                                    <span
                                                        className={`font-tango text-[14pt] leading-none md:hidden ${
                                                            selected === skill
                                                                ? "text-white"
                                                                : "text-black"
                                                        }`}
                                                    >
                                                        {skill}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col w-full md:w-1/2 md:mt-[-75px] order-1 md:order-2">
                        <header className="flex flex-col w-full h-[10%]" />
                        <div className="flex flex-col gap-4 h-full justify-between text-black">
                            {selected && (
                                <div className="flex flex-col mr-12 md:max-w-[350px]">
                                    <div className="flex flex-row justify-between">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-pixel text-[8pt] md:text-[10pt]">
                                                {selectedCategory}
                                            </span>
                                            <span className="font-tango text-[30pt] md:text-[40pt] leading-none">
                                                {selected}
                                            </span>
                                        </div>

                                        <div className="flex items-center">
                                            <Image
                                                src={`/${selected}.png`}
                                                width={50}
                                                height={50}
                                                alt={selected}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-4">
                                        <Image
                                            src="/divider.png"
                                            width={250}
                                            height={250}
                                            className="md:w-[350px]"
                                            alt="divider"
                                        />
                                        <div className="flex flex-row gap-6 items-center">
                                            <Image
                                                src={`/skill_gifs/${selected}.gif`}
                                                width={100}
                                                height={100}
                                                alt="icon"
                                                unoptimized
                                            />
                                            <div className="flex flex-col gap-4 flex-grow">
                                                <span className="text-black text-xs font-pixel text-left">
                                                    {
                                                        (
                                                            skill_data as SkillData
                                                        )[selected]?.level
                                                    }
                                                </span>
                                                <Skillbar
                                                    level={
                                                        (
                                                            skill_data as SkillData
                                                        )[selected]?.level
                                                    }
                                                />
                                                <span className="text-black text-md mt-[-10px] font-louis text-left">
                                                    {
                                                        (
                                                            skill_data as SkillData
                                                        )[selected]?.length
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                        <div className="font-tango">
                                            PROJECTS
                                        </div>
                                        <div className="flex flex-wrap flex-row gap-2">
                                            {(skill_data as SkillData)[
                                                selected
                                            ]?.projects.map(
                                                (project, index) => (
                                                    <a
                                                        key={index}
                                                        href={`/projects?project=${project
                                                            .toLowerCase()
                                                            .replace(
                                                                /\s+/g,
                                                                "-"
                                                            )}`}
                                                        className="flex flex-row justify-center items-center bg-black p-2 rounded-full border-2 border-default text-white hover:bg-white hover:text-black cursor-pointer gap-1 group"
                                                    >
                                                        <span className="font-pixel text-[7pt]">
                                                            {project}
                                                        </span>
                                                        <span className="flex font-pixel text-2xl opacity-0 transform translate-x-[-5px] transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
                                                            →
                                                        </span>
                                                    </a>
                                                )
                                            )}
                                        </div>
                                        <div className="font-tango">
                                            EXPERIENCE
                                        </div>
                                        <div className="flex flex-wrap flex-row gap-2">
                                            {(skill_data as SkillData)[
                                                selected
                                            ]?.experience.map((xp, index) => (
                                                <div
                                                    key={index}
                                                    className="flex bg-white px-3 py-1 rounded-full border-[3px] border-black text-black hover:bg-black hover:text-white"
                                                >
                                                    <span className="font-louis text-xs">
                                                        {xp}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
