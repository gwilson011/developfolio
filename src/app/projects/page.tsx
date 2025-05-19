"use client";
import Navbar from "../components/Navbar";
import Socialbar from "../components/Socialbar";
import React, { useEffect, Suspense } from "react";
import ProjectFolders from "../components/ProjectFolders";
import Folder from "../components/Folder";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

function ProjectsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const [projects, setProjects] = React.useState({});
    const [selectedProject, setSelectedProject] = React.useState<string | null>(
        null
    );

    useEffect(() => {
        // Wrap window access in useEffect to ensure it only runs client-side
        if (typeof window !== "undefined") {
            const path = window.location.pathname;
            const queryProject = searchParams.get("project");
            const pathProject = path.split("/projects/")[1];

            console.log("Current query project:", queryProject);
            console.log("Current path project:", pathProject);

            // Set selected project from either source
            if (queryProject) {
                console.log("Setting project from query:", queryProject);
                setSelectedProject(queryProject);
                // Force URL update to match
                router.push(`/projects?project=${queryProject}`);
            } else if (pathProject) {
                console.log("Setting project from path:", pathProject);
                setSelectedProject(pathProject);
                router.push(`/projects/${pathProject}`);
            }

            // Fetch the JSON from the public directory
            fetch("/projects.json")
                .then((response) => response.json())
                .then((data) => {
                    console.log("Fetched projects:", data);
                    setProjects(data);
                });
        }
    }, [pathname, searchParams, router]);

    const handleProjectClick = (projectSlug: string) => {
        // If clicking the same project, deselect it
        if (selectedProject === projectSlug) {
            setSelectedProject(null);
            router.push("/projects");
        } else {
            // Select the new project
            setSelectedProject(projectSlug);
            router.push(`/projects?project=${projectSlug}`);
        }
    };

    return (
        <div className="flex flex-col gap-16 h-[calc(100vh-160px)] md:flex-row md:mr-24 md:ml-24">
            <div className="flex flex-col gap-12 mb-6 md:mb-0 w-full">
                <span className="font-tango text-black text-[40pt] md:text-[70pt] text-start leading-none">
                    PROJECTS
                </span>
                <div className="flex flex-col align-left gap-12">
                    {/* <ProjectFolders
                        projects={projects}
                        onProjectClick={handleProjectClick}
                        selectedProject={selectedProject}
                    /> */}
                    <Folder
                        projects={projects.personal}
                        folderName="PERSONAL"
                        selected={selectedProject === "PERSONAL"}
                        updateSelected={(name) => setSelectedProject(name)}
                    ></Folder>
                    <Folder
                        projects={projects.clubs}
                        folderName="CLUBS"
                        selected={selectedProject === "CLUBS"}
                        updateSelected={(name) => setSelectedProject(name)}
                    ></Folder>
                    <Folder
                        projects={projects.school}
                        folderName="SCHOOL"
                        selected={selectedProject === "SCHOOL"}
                        updateSelected={(name) => setSelectedProject(name)}
                    ></Folder>
                    {/* <Folder
                        projects={projects.work}
                        folderName="WORK"
                    ></Folder> */}
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
