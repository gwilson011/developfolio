"use client";
import Navbar from "../components/Navbar";
import Socialbar from "../components/Socialbar";
import React, { useEffect, useRef } from "react";
import ProjectCard from "../components/ProjectCard";
import {
    useScroll,
    useMotionValueEvent,
    useTransform,
    motion,
} from "framer-motion";

import projects from "./projects.json";

export default function Projects() {
    const targetRef = useRef<HTMLDivElement>(null);
    const { scrollY } = useScroll({
        target: targetRef,
        offset: ["start start", "end end"],
    });

    useMotionValueEvent(scrollY, "change", () => {
        console.log(scrollY.get());
    });

    const cardTimeline = projects.map((_, i) => {
        const start = 500 + i * 500;
        const end = 500 + (i + 1) * 500;
        return [start, end];
    });

    const timeline = [[0, 500], ...cardTimeline];

    const animation = timeline.map((data) => ({
        scale: useTransform(scrollY, data, [1, 0.8]),
        opacity: useTransform(scrollY, data, [1, 0]),
    }));

    useEffect(() => {
        // Get the div element
        let divElement = document.getElementById("card");
        // Scroll to the bottom of the div
        if (divElement != null) {
            divElement.scrollTop = divElement.scrollHeight;
        }
    }, []);

    return (
        <div className="flex flex-col w-full h-[90vh] p-4 gap-4 md:gap-6">
            <Socialbar />
            <Navbar home={true} />
            <div className="flex flex-col gap-32 md:flex-row h-full md:mr-24 md:ml-24 mb-10">
                <div className="flex flex-col justify-between mb-6 md:mb-0">
                    <span className="font-tango text-black text-[40pt] md:text-[70pt] text-start leading-none">
                        PROJECTS
                    </span>
                </div>
                <div
                    ref={targetRef}
                    className="space-y-20 h-full relative overflow-auto"
                    id="card"
                >
                    <div className="flex flex-col gap-4">
                        {Object.entries(projects).map(([key, project], i) => (
                            <motion.div
                                className={`h-full sticky text-black`}
                                style={{
                                    top: `${i * 25}px`,
                                    // scale: animation[i + 1].scale,
                                    // opacity: animation[i + 1].opacity,
                                }}
                            >
                                <ProjectCard
                                    key={key}
                                    project={{ ...project }}
                                />
                            </motion.div>
                        ))}
                        <div className="flex h-full"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
