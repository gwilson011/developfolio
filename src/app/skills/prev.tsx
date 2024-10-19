"use client";
import Navbar from "../components/Navbar";
import Socialbar from "../components/Socialbar";
import React from "react";
import { useState } from "react";
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
        return null; // Return null instead of the string "null"
    }

    const update = (val: string) => {
        setSelected(val);
        setSelectedCategory(findKeyByValue(categories, val) || "");
    };

    return (
        <div className="flex flex-col w-full h-screen p-4 gap-2">
            <Socialbar />
            <Navbar home={true} />
            <div className="flex flex-row w-full h-full mr-24 ml-24 mb-10">
                <div className="flex flex-col justify-between">
                    <span className="font-tango text-black text-[70pt] text-start leading-none">
                        SKILLS
                    </span>
                    <div className="flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                            <span className="text-black font-pixel">
                                BACK END
                            </span>
                            <div className="flex flex-row gap-2">
                                <button
                                    className="border-default text-black p-2"
                                    onClick={() => update("NODE.JS")}
                                    style={{
                                        background:
                                            selected == "NODE.JS"
                                                ? "black"
                                                : "none",
                                    }}
                                >
                                    <Image
                                        src="/NODE.JS.png"
                                        width={50}
                                        height={50}
                                        alt="node.js"
                                        style={{
                                            filter:
                                                selected == "NODE.JS"
                                                    ? "invert(1)"
                                                    : "none",
                                        }}
                                    />
                                </button>
                                <button
                                    className="border-default text-black p-2"
                                    onClick={() => update("EXPRESS")}
                                    style={{
                                        background:
                                            selected == "EXPRESS"
                                                ? "black"
                                                : "none",
                                    }}
                                >
                                    <Image
                                        src="/EXPRESS.png"
                                        width={50}
                                        height={50}
                                        alt="express"
                                        style={{
                                            filter:
                                                selected == "EXPRESS"
                                                    ? "invert(1)"
                                                    : "none",
                                        }}
                                    />
                                </button>
                                <button
                                    className="border-default text-black p-2"
                                    onClick={() => update("POSTGRESQL")}
                                    style={{
                                        background:
                                            selected == "POSTGRESQL"
                                                ? "black"
                                                : "none",
                                    }}
                                >
                                    <Image
                                        src="/POSTGRESQL.png"
                                        width={50}
                                        height={50}
                                        alt="postgresql"
                                        style={{
                                            filter:
                                                selected == "POSTGRESQL"
                                                    ? "invert(1)"
                                                    : "none",
                                        }}
                                    />
                                </button>
                                <button
                                    className="border-default text-black p-2"
                                    onClick={() => update("SQL")}
                                    style={{
                                        background:
                                            selected == "SQL"
                                                ? "black"
                                                : "none",
                                    }}
                                >
                                    <Image
                                        src="/SQL.png"
                                        width={50}
                                        height={50}
                                        alt="sql"
                                        style={{
                                            filter:
                                                selected == "SQL"
                                                    ? "invert(1)"
                                                    : "none",
                                        }}
                                    />
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <span className="text-black font-pixel">
                                LANGUAGES
                            </span>
                            <div className="flex flex-row gap-2">
                                <button
                                    className="border-default text-black p-2"
                                    onClick={() => update("PYTHON")}
                                    style={{
                                        background:
                                            selected == "PYTHON"
                                                ? "black"
                                                : "none",
                                    }}
                                >
                                    <Image
                                        src="/PYTHON.png"
                                        width={50}
                                        height={50}
                                        alt="python"
                                        style={{
                                            filter:
                                                selected == "PYTHON"
                                                    ? "invert(1)"
                                                    : "none",
                                        }}
                                    />
                                </button>
                                <button
                                    className="border-default text-black p-2 font-tango text-[20pt] px-4"
                                    onClick={() => update("JAVASCRIPT")}
                                    style={{
                                        background:
                                            selected == "JAVASCRIPT"
                                                ? "black"
                                                : "none",
                                        color:
                                            selected == "JAVASCRIPT"
                                                ? "white"
                                                : "black",
                                    }}
                                >
                                    JS
                                </button>
                                <button
                                    className="border-default text-black p-2"
                                    onClick={() => update("C++")}
                                    style={{
                                        background:
                                            selected == "C++"
                                                ? "black"
                                                : "none",
                                    }}
                                >
                                    <Image
                                        src="/C++.png"
                                        width={50}
                                        height={50}
                                        alt="c++"
                                        style={{
                                            filter:
                                                selected == "C++"
                                                    ? "invert(1)"
                                                    : "none",
                                        }}
                                    />
                                </button>
                                <button
                                    className="border-default text-black p-2"
                                    onClick={() => update("SWIFT")}
                                    style={{
                                        background:
                                            selected == "SWIFT"
                                                ? "black"
                                                : "none",
                                    }}
                                >
                                    <Image
                                        src="/SWIFT.png"
                                        width={50}
                                        height={50}
                                        alt="swift"
                                        style={{
                                            filter:
                                                selected == "SWIFT"
                                                    ? "invert(1)"
                                                    : "none",
                                        }}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex w-full h-full"></div>
                <div className="flex flex-col w-full h-full mr-40">
                    <header className="flex flex-col w-full h-[10%]" />
                    <div className="flex flex-col gap-2 h-full justify-between text-black">
                        <div className="flex flex-col">
                            <div className="flex flex-row justify-between max-w-[350px] mr-[10%]">
                                <div className=" flex flex-col gap-1">
                                    <span className="font-pixel text-[10pt]">
                                        {selectedCategory}
                                    </span>
                                    <span className="font-tango text-[40pt] leading-none">
                                        {selected}
                                    </span>
                                </div>
                                {selected && (
                                    <div className="flex items-center">
                                        <Image
                                            src={`/${selected}.png`}
                                            width={70}
                                            height={70}
                                            alt={selected}
                                        />
                                    </div>
                                )}
                            </div>
                            {selected && (
                                <Image
                                    src="/divider.png"
                                    width={350}
                                    height={350}
                                    alt="divider"
                                />
                            )}
                        </div>
                        <div className="flex flex-col justify-end gap-2">
                            <span className="text-black font-pixel">
                                FRONT END
                            </span>
                            <div className="flex flex-row gap-2">
                                <button
                                    className="border-default text-black p-2"
                                    onClick={() => update("REACT")}
                                    style={{
                                        background:
                                            selected == "REACT"
                                                ? "black"
                                                : "none",
                                    }}
                                >
                                    <Image
                                        src="/REACT.png"
                                        width={50}
                                        height={50}
                                        alt="react"
                                        style={{
                                            filter:
                                                selected == "REACT"
                                                    ? "invert(1)"
                                                    : "none",
                                        }}
                                    />
                                </button>
                                <button
                                    className="border-default text-black p-2 font-tango text-[20pt] px-4"
                                    onClick={() => update("TYPESCRIPT")}
                                    style={{
                                        background:
                                            selected == "TYPESCRIPT"
                                                ? "black"
                                                : "none",
                                        color:
                                            selected == "TYPESCRIPT"
                                                ? "white"
                                                : "black",
                                    }}
                                >
                                    TS
                                </button>
                                <button
                                    className="border-default text-black p-2"
                                    onClick={() => update("CSS")}
                                    style={{
                                        background:
                                            selected == "CSS"
                                                ? "black"
                                                : "none",
                                    }}
                                >
                                    <Image
                                        src="/CSS.png"
                                        width={50}
                                        height={50}
                                        alt="css"
                                        style={{
                                            filter:
                                                selected == "CSS"
                                                    ? "invert(1)"
                                                    : "none",
                                        }}
                                    />
                                </button>
                                <button
                                    className="border-default text-black p-2"
                                    onClick={() => update("REDUX")}
                                    style={{
                                        background:
                                            selected == "REDUX"
                                                ? "black"
                                                : "none",
                                    }}
                                >
                                    <Image
                                        src="/REDUX.png"
                                        width={50}
                                        height={50}
                                        alt="redux"
                                        style={{
                                            filter:
                                                selected == "REDUX"
                                                    ? "invert(1)"
                                                    : "none",
                                        }}
                                    />
                                </button>
                            </div>
                            <div className="flex flex-row gap-2">
                                <button
                                    className="border-default text-black p-2"
                                    onClick={() => update("NEXT.JS")}
                                    style={{
                                        background:
                                            selected == "NEXT.JS"
                                                ? "black"
                                                : "none",
                                    }}
                                >
                                    <Image
                                        src="/NEXT.png"
                                        width={50}
                                        height={50}
                                        alt="next.js"
                                        style={{
                                            filter:
                                                selected == "NEXT.JS"
                                                    ? "invert(1)"
                                                    : "none",
                                        }}
                                    />
                                </button>
                                <button
                                    className="border-default text-black p-2"
                                    onClick={() => update("SVELTE")}
                                    style={{
                                        background:
                                            selected == "SVELTE"
                                                ? "black"
                                                : "none",
                                    }}
                                >
                                    <Image
                                        src="/SVELTE.png"
                                        width={50}
                                        height={50}
                                        alt="svelte"
                                        style={{
                                            filter:
                                                selected == "SVELTE"
                                                    ? "invert(1)"
                                                    : "none",
                                        }}
                                    />
                                </button>
                                <div
                                    className="flex flex-col border-default text-black p-2 items-center"
                                    onClick={() => update("REACT NATIVE")}
                                    style={{
                                        background:
                                            selected == "REACT NATIVE"
                                                ? "black"
                                                : "none",
                                        color:
                                            selected == "REACT NATIVE"
                                                ? "white"
                                                : "black",
                                    }}
                                >
                                    <Image
                                        src="/REACT.png"
                                        width={30}
                                        height={30}
                                        alt="react native"
                                        style={{
                                            filter:
                                                selected == "REACT NATIVE"
                                                    ? "invert(1)"
                                                    : "none",
                                        }}
                                    />
                                    native
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
