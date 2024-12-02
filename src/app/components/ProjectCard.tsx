"use client";
import Link from "next/link";
import Image from "next/image";

interface Project {
    title: string;
    year: number;
    desc: string;
    image: string;
    href: { demo: string; repo: string };
}

interface ProjectCardProject {
    project: Project;
}

const ProjectCard = ({ project }: ProjectCardProject) => {
    return (
        <div
            className="h-full space-y-4 border-default text-black p-4 justify-between bg-white" //hover:text-white hover:bg-black"
            // onMouseEnter={() => setHover && setHover(true)}
            // onMouseLeave={() => setHover && setHover(false)}
        >
            <div className="flex flex-col justify-start gap-6 h-full p-5">
                <div className="flex flex-row justify-between content-end">
                    <span className="font-tango text-3xl">{project.title}</span>
                    <span className="font-pixel text-xs">{project.year}</span>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="font-louis flex-1 break-words overflow-y-auto max-w-80">
                        {project.desc}
                    </div>
                    <Link
                        href={project.href.demo}
                        className="flex text-center justify-center p-2 px-2 bg-white border-default text-black font-tango text-md hover:text-white hover:bg-black"
                        target="_blank"
                    >
                        DEMO
                    </Link>
                    <Link
                        href={project.href.repo}
                        className="flex text-center justify-center p-2 px-2 bg-white border-default text-black font-tango text-md hover:text-white hover:bg-black"
                        target="_blank"
                    >
                        REPO
                    </Link>
                </div>
                <Image
                    alt="home"
                    src={project.image}
                    width={200}
                    height={80}
                    className="rounded w-full overflow-hidden"
                    style={{ maxHeight: 250 }}
                />
            </div>
        </div>
    );
};

export default ProjectCard;
