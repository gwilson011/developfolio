"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Socialbar from "../../components/Socialbar";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Project {
    title: string;
    slug: string;
    year: string;
    desc: string;
    image: string;
    href: { demo: string; repo: string };
    languages: string[];
    technologies: string[];
}

export default function ProjectPage() {
    const router = useRouter();
    const { slug } = useParams();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [demoUnavailable, setDemoUnavailable] = useState<boolean>(false);
    const [repoUnavailable, setRepoUnavailable] = useState<boolean>(false);

    useEffect(() => {
        fetch("/projects.json")
            .then((res) => res.json())
            .then((data) => {
                const allProjects = [
                    ...(data.personal || []),
                    ...(data.clubs || []),
                    ...(data.school || []),
                ];
                const foundProject = allProjects.find(
                    (p: Project) => p.slug === slug
                );
                setProject(foundProject || null);
                setRepoUnavailable(
                    foundProject.href.repo == "private" ||
                        foundProject.href.repo == ""
                );
                setDemoUnavailable(foundProject.href.demo == "");
                setLoading(false);
            })
            .catch((error) => {
                console.error("Error loading projects:", error);
                setLoading(false);
            });
    }, [slug]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!project) {
        return <div>Project not found</div>;
    }

    return (
        <div className="flex flex-col w-full h-full p-4 gap-4 md:gap-6">
            <Socialbar />
            <button onClick={() => router.push("/projects")}>
                <Image
                    className="ml-4"
                    alt="back"
                    src="/back_arrow.svg"
                    height={40}
                    width={40}
                />
            </button>

            <div className="flex flex-col md:flex-row gap-10 p-3">
                <div className="flex flex-col gap-16 md:mx-24 md:max-w-[30%]">
                    <div className="flex flex-row justify-between w-full items-center">
                        <span className="font-tango text-black text-fit leading-none">
                            {project.title}
                        </span>
                        <span className="text-black font-pixel text-xs">
                            {project.year}
                        </span>
                    </div>

                    <p className="text-black font-louis">{project.desc}</p>
                    <div className="flex justify-between flex-row gap-6 ">
                        <div>
                            <span className="font-tango text-2xl text-black">
                                LANGUAGES
                            </span>
                            <div className="flex flex-col gap-2 font-pixel text-xs text-gray-400">
                                {project.languages.map((language) => (
                                    <div>{language}</div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <span className="font-tango text-2xl text-black">
                                TECHNOLOGIES
                            </span>
                            <div className="flex flex-col gap-2 font-pixel text-xs text-gray-400">
                                {project.technologies.map((techs) => (
                                    <div>{techs}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col justify-center gap-3">
                        <Link
                            href={project.href.demo}
                            className={`flex text-center justify-center flex-grow  border-default rounded-md p-2 px-2 text-black font-tango text-base ${
                                demoUnavailable
                                    ? "hover:cursor-not-allowed text-gray-400 !border-gray-400"
                                    : "hover:text-white hover:bg-black"
                            }`}
                            target="_blank"
                        >
                            DEMO
                        </Link>
                        <Link
                            href={project.href.repo}
                            className={`flex text-center justify-center flex-grow  border-default rounded-md p-2 px-2 text-black font-tango text-base ${
                                repoUnavailable
                                    ? "hover:cursor-not-allowed text-gray-400 !border-gray-400"
                                    : "hover:text-white hover:bg-black"
                            }`}
                            target="_blank"
                        >
                            REPO
                        </Link>
                    </div>
                </div>
                <div className="flex flex-col justify-end md:pr-24">
                    <Image
                        alt="home"
                        src={`/project_previews/${project.image}`}
                        className="rounded overflow-hidden h-auto w-auto max-h-[600px] max-w-full"
                        width={0}
                        height={0}
                        sizes="100vw"
                    />
                </div>
            </div>
        </div>
    );
}
