"use client";
import Link from "next/link";
import Image from "next/image";

interface Project {
    title: string;
    year: string;
    desc: string;
    image: string;
    href: { demo: string; repo: string };
    languages: string[];
    technologies: string[];
}

interface ProjectCardProject {
    project: Project;
}

const ProjectCard = ({ project }: ProjectCardProject) => {
    return (
        <div
            className="h-full w-full text-white p-4 justify-between" //hover:text-white hover:bg-black"
            // onMouseEnter={() => setHover && setHover(true)}
            // onMouseLeave={() => setHover && setHover(false)}
        >
            <div className="flex flex-col justify-start gap-6 h-full p-5 ">
                <div className="flex flex-row justify-between content-end">
                    <span className="font-tango text-2xl">{project.title}</span>
                    <span className="font-pixel text-xs">{project.year}</span>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="font-louis flex-1 break-words overflow-y-auto text-base">
                        {project.desc}
                    </div>
                    <Image
                        alt="home"
                        src={project.image}
                        width={200}
                        height={80}
                        className="rounded w-full overflow-hidden"
                        style={{ maxHeight: 220, objectFit: "cover" }}
                    />
                    <div className="flex flex-row justify-center gap-3">
                        <Link
                            href={project.href.demo}
                            className="flex text-center justify-center flex-grow border-white border-[3px] rounded-md p-2 px-2 bg-black text-white font-tango text-base hover:text-black hover:bg-white"
                            target="_blank"
                        >
                            DEMO
                        </Link>
                        <Link
                            href={project.href.repo}
                            className="flex text-center justify-center flex-grow border-white border-[3px] rounded-md p-2 px-2 bg-black text-white font-tango text-base hover:text-black hover:bg-white"
                            target="_blank"
                        >
                            REPO
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectCard;
