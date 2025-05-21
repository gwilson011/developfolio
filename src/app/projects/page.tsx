"use client";
import Navbar from "../components/Navbar";
import Socialbar from "../components/Socialbar";
import React, { useEffect, Suspense, useState } from "react";
import Folder from "../components/Folder";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ProjectCategories } from "@/types/project"; // adjust path as needed

function ProjectsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const [projects, setProjects] = useState<ProjectCategories>({});
    const [selectedProject, setSelectedProject] = React.useState<string | null>(
        null
    );
    const [selectedFolder, setSelectedFolder] = React.useState<string | null>(
        null
    );

    useEffect(() => {
        if (typeof window !== "undefined") {
            const queryProject = searchParams.get("project");

            // Load projects.json
            fetch("/projects.json")
                .then((response) => response.json())
                .then((data) => {
                    setProjects(data);
                });

            // Only update selected project if on the main /projects page
            if (pathname === "/projects" && queryProject) {
                setSelectedProject(queryProject);
            }
        }
    }, [pathname, searchParams]);

    const handleProjectClick = (projectSlug: string) => {
        // If clicking the same project, deselect it
        if (selectedProject === projectSlug) {
            setSelectedProject(null);
            router.push("/projects");
        } else {
            // Select the new project
            setSelectedProject(projectSlug);
            router.push(`/projects/${projectSlug}`);
        }
    };

    return (
        <div className="flex flex-col gap-16 h-[calc(100vh-160px)] md:mr-24 md:ml-24">
            <div className="flex flex-col gap-12 mb-6 md:mb-0 w-full">
                <div className="flex flex-row gap-10 items-end">
                    <span className="font-tango text-black text-[60pt] text-start leading-none">
                        PROJECTS
                    </span>
                    {/* <span className="text-black font-pixel text-xs mb-[15pt]">
                        SORTED BY DATE
                    </span> */}
                </div>
                <div className="flex flex-col align-left gap-12">
                    {/* <ProjectFolders
                        projects={projects}
                        onProjectClick={handleProjectClick}
                        selectedProject={selectedProject}
                    /> */}
                    <Folder
                        projects={projects.personal || []}
                        folderName="PERSONAL"
                        selected={selectedFolder === "PERSONAL"}
                        updateSelected={(name) => setSelectedFolder(name)}
                        handleProjectClick={(slug) => {
                            if (slug) handleProjectClick(slug);
                        }}
                    ></Folder>
                    <Folder
                        projects={projects.clubs || []}
                        folderName="CLUBS"
                        selected={selectedFolder === "CLUBS"}
                        updateSelected={(name) => setSelectedFolder(name)}
                        handleProjectClick={(slug) => {
                            if (slug) handleProjectClick(slug);
                        }}
                    ></Folder>
                    <Folder
                        projects={projects.school || []}
                        folderName="SCHOOL"
                        selected={selectedFolder === "SCHOOL"}
                        updateSelected={(name) => setSelectedFolder(name)}
                        handleProjectClick={(slug) => {
                            if (slug) handleProjectClick(slug);
                        }}
                    ></Folder>
                </div>
            </div>
        </div>
    );
}

export default function Projects() {
    return (
        <div className="flex flex-col w-full h-full p-4 gap-4 md:gap-6">
            <Socialbar />
            <Navbar home={true} />
            <Suspense fallback={<div>Loading...</div>}>
                <ProjectsContent />
            </Suspense>
        </div>
    );
}
