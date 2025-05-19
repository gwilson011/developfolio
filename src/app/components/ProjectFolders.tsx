import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

interface Project {
    title: string;
    slug: string;
    description: string;
    year: string;
    desc: string;
    image: string;
    href: { demo: string; repo: string };
    languages: string[];
    technologies: string[];
}

interface ProjectFoldersProps {
    projects: Project[];
    onProjectClick: (slug: string) => void;
    selectedProject: string | null;
}

const ProjectFolders: React.FC<ProjectFoldersProps> = ({
    projects,
    onProjectClick,
    selectedProject,
}) => {
    const [image, setImage] = useState<string | null>(null);

    useEffect(() => {
        if (selectedProject && projects.length > 0) {
            const project = projects.find((p) => p.slug === selectedProject);
            setImage(project ? project.image : null);
        } else {
            setImage(null);
        }
    }, [selectedProject, projects]);

    const handleProjectClick = (project: Project) => {
        if (selectedProject === project.slug) {
            onProjectClick(project.slug);
        } else {
            onProjectClick(project.slug);
        }
    };

    return (
        <div className="pt-5 w-full h-full flex flex-col md:flex-row">
            <div className="w-full h-[300px] md:h-full bg-gray-100/5 rounded-lg relative p-2 md:p-4 mb-2 md:mb-0 md:ml-4 order-1 md:order-2">
                {image && (
                    <Image
                        alt="Selected project preview"
                        src={image}
                        fill
                        className="object-contain rounded-lg p-2"
                        priority
                    />
                )}
            </div>
            <div className="w-full h-[calc(100vh-theme(spacing.16))] md:h-full bg-gray-100/5 rounded-lg overflow-y-auto order-2 md:order-1">
                <div className="space-y-2 md:space-y-4 pt-2 md:pt-3">
                    {projects.map((project) => {
                        const isSelected = selectedProject === project.slug;

                        return (
                            <div
                                key={project.slug}
                                className={`w-full transition-all duration-300 ease-in-out 
                                    ${
                                        !isSelected &&
                                        "hover:-translate-y-2 active:translate-y-0"
                                    }`}
                                onClick={() => handleProjectClick(project)}
                            >
                                <div className="border-default cursor-pointer text-black shadow-lg rounded-lg">
                                    <div className="p-2 md:p-4">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-xl md:text-2xl font-tango truncate">
                                                {project.title}
                                            </h3>
                                            <p className="text-black/50 font-pixel text-xs md:text-sm ml-4">
                                                {project.year}
                                            </p>
                                        </div>

                                        {isSelected && (
                                            <div className="flex flex-col gap-3 md:gap-6 mt-3 md:mt-4">
                                                <p className="font-louis text-sm md:text-base leading-relaxed">
                                                    {project.desc}
                                                </p>
                                                <div className="flex gap-2 md:gap-4">
                                                    <Link
                                                        href={project.href.demo}
                                                        className="flex-1 text-center border-default border-2 md:border-[3px] rounded-md py-2 md:py-3 bg-black text-white font-tango hover:text-black hover:bg-white transition-colors duration-200"
                                                        target="_blank"
                                                    >
                                                        DEMO
                                                    </Link>
                                                    <Link
                                                        href={project.href.repo}
                                                        className="flex-1 text-center border-default border-2 md:border-[3px] rounded-md py-2 md:py-3 bg-black text-white font-tango hover:text-black hover:bg-white transition-colors duration-200"
                                                        target="_blank"
                                                    >
                                                        REPO
                                                    </Link>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ProjectFolders;
