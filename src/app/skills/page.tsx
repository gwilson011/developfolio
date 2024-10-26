"use client";
import Navbar from "../components/Navbar";
import Socialbar from "../components/Socialbar";
import React, { useState } from "react";
import Image from "next/image";

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
        <div className="flex flex-col w-full h-screen p-4 gap-4 md:gap-6 ">
            <Socialbar />
            <Navbar home={true} />
            <div className="flex flex-col md:flex-row h-full md:mr-24 md:ml-24 mb-10">
                <div className="flex flex-col justify-between mb-6 md:mb-0">
                    <span className="font-tango text-black text-[40pt] md:text-[70pt] text-start leading-none">
                        SKILLS
                    </span>
                    <div className="flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                            <span className="text-black font-pixel">
                                BACK END
                            </span>
                            <div className="grid grid-cols-2 gap-2 md:flex md:flex-row">
                                {[
                                    "NODE.JS",
                                    "EXPRESS",
                                    "POSTGRESQL",
                                    "SQL",
                                ].map((skill) => (
                                    <button
                                        key={skill}
                                        className="border-default text-black p-2"
                                        onClick={() => update(skill)}
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
                                                    selected === skill
                                                        ? "invert(1)"
                                                        : "none",
                                            }}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <span className="text-black font-pixel">
                                LANGUAGES
                            </span>
                            <div className="grid grid-cols-2 gap-2 md:flex md:flex-row">
                                {["PYTHON", "JAVASCRIPT", "C++", "SWIFT"].map(
                                    (language) => (
                                        <button
                                            key={language}
                                            className="border-default text-black p-2"
                                            onClick={() => update(language)}
                                            style={{
                                                background:
                                                    selected === language
                                                        ? "black"
                                                        : "none",
                                            }}
                                        >
                                            <Image
                                                src={`/${language}.png`}
                                                width={50}
                                                height={50}
                                                alt={language}
                                                style={{
                                                    filter:
                                                        selected === language
                                                            ? "invert(1)"
                                                            : "none",
                                                }}
                                            />
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex w-full h-full md:mr-40"></div>
                <div className="flex flex-col w-full h-full">
                    <header className="flex flex-col w-full h-[10%]" />
                    <div className="flex flex-col gap-4 h-full justify-between text-black">
                        <div className="flex flex-col">
                            <div className="flex flex-row justify-between max-w-[250px] md:max-w-[350px]">
                                <div className="flex flex-col gap-1">
                                    <span className="font-pixel text-[8pt] md:text-[10pt]">
                                        {selectedCategory}
                                    </span>
                                    <span className="font-tango text-[30pt] md:text-[40pt] leading-none">
                                        {selected}
                                    </span>
                                </div>
                                {selected && (
                                    <div className="flex items-center">
                                        <Image
                                            src={`/${selected}.png`}
                                            width={50}
                                            height={50}
                                            alt={selected}
                                        />
                                    </div>
                                )}
                            </div>
                            {selected && (
                                <Image
                                    src="/divider.png"
                                    width={250}
                                    height={250}
                                    className="md:w-[350px]"
                                    alt="divider"
                                />
                            )}
                        </div>
                        <div className="flex flex-col justify-end gap-2">
                            <span className="text-black font-pixel">
                                FRONT END
                            </span>
                            <div className="grid grid-cols-2 flex-wrap gap-2 md:flex md:flex-row">
                                {[
                                    "REACT",
                                    "TYPESCRIPT",
                                    "CSS",
                                    "REDUX",
                                    "NEXT.JS",
                                    "SVELTE",
                                    "REACT NATIVE",
                                ].map((frontend) => (
                                    <button
                                        key={frontend}
                                        className="border-default text-black p-2"
                                        onClick={() => update(frontend)}
                                        style={{
                                            background:
                                                selected === frontend
                                                    ? "black"
                                                    : "none",
                                        }}
                                    >
                                        <Image
                                            src={`/${frontend}.png`}
                                            width={50}
                                            height={50}
                                            alt={frontend}
                                            style={{
                                                filter:
                                                    selected === frontend
                                                        ? "invert(1)"
                                                        : "none",
                                            }}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
