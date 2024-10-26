import Image from "next/image";
import Navbar from "../components/Navbar";
import Socialbar from "../components/Socialbar";
import React from "react";
import ProjectCard from "../components/ProjectCard";

import projects from "./projects.json";

export default function Projects() {
    return (
        <div className="flex flex-col w-full h-screen p-4 gap-4 md:gap-6">
            <Socialbar />
            <Navbar home={true} />
            <div className="flex flex-col gap-32 md:flex-row h-full md:mr-24 md:ml-24 mb-10">
                <div className="flex flex-col justify-between mb-6 md:mb-0">
                    <span className="font-tango text-black text-[40pt] md:text-[70pt] text-start leading-none">
                        PROJECTS
                    </span>
                </div>
                <div className="flex flex-col w-full h-full gap-3">
                    {Object.entries(projects).map(([key, project]) => (
                        <ProjectCard project={project} />
                    ))}
                </div>
            </div>
        </div>
    );
}
