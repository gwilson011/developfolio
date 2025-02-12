"use client";
import Navbar from "../components/Navbar";
import Socialbar from "../components/Socialbar";
import React, { useEffect, useRef } from "react";
import ProjectCard from "../components/ProjectCard";
import Card from "../components/ProjectScroller";
import { ModelComponent } from "../components/Model";
import projects from "../projects/projects.json";
import ProjectFolders from "../components/ProjectFolders";
import { useRouter, usePathname } from "next/navigation";

export default function Projects() {
    const container = useRef(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Get the div element
        const divElement = document.getElementById("card");
        // Scroll to the bottom of the div
        if (divElement != null) {
            divElement.scrollTop = divElement.scrollHeight;
        }
    }, []);

    const handleProjectClick = (projectSlug: string) => {
        router.push(`/projects/${projectSlug}`);
    };

    return (
        <div className="flex flex-col w-full h-full p-4 gap-4 md:gap-6">
            <Socialbar />
            <Navbar home={true} />
            <div className="flex flex-col gap-16 h-[calc(100vh-160px)] md:flex-row md:mr-24 md:ml-24">
                <div className="flex flex-col justify-between mb-6 md:mb-0 w-full">
                    <span className="font-tango text-black text-[40pt] md:text-[70pt] text-start leading-none">
                        PROJECTS
                    </span>
                    <div className="flex flex-grow items-center">
                        <ProjectFolders
                            projects={projects}
                            onProjectClick={handleProjectClick}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
