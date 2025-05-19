import { useEffect, useState } from "react";
import { string } from "three/tsl";
import Image from "next/image";
import { TrefoilPolynomialKnot } from "three/examples/jsm/curves/CurveExtras.js";

const FOLDER_SIZE = 80;
const ICON_SIZE = 60;

interface Project {
    title: string;
    slug: string;
    description: string;
    year: string;
    desc: string;
    image: string;
    href: { demo: string; repo: string };
}

interface FolderProps {
    projects: Project[];
    folderName: string | null;
    selected: boolean;
    updateSelected: (folderName: string | null) => void;
}

const Folder: React.FC<FolderProps> = ({
    projects,
    folderName,
    selected,
    updateSelected,
}) => {
    const update = () => {
        setOpen(!open);
        updateSelected(folderName);
    };

    const [open, setOpen] = useState<boolean>(false);
    const [selectedIcon, setSelectedIcon] = useState<string>("");

    useEffect(() => {
        console.log("test");
        if (!selected) {
            setOpen(false);
        }
    }, [selected]);

    return (
        <div className="flex flex-row flex-wrap gap-12">
            <div className="flex flex-col items-center justify-center items-end">
                {open ? (
                    <Image
                        alt="folder"
                        src={"/project_icons/open_file.png"}
                        width={FOLDER_SIZE}
                        height={FOLDER_SIZE}
                        onClick={() => update()}
                    />
                ) : (
                    <Image
                        alt="folder"
                        src={"/project_icons/closed_file.png"}
                        width={FOLDER_SIZE}
                        height={FOLDER_SIZE}
                        onClick={() => update()}
                    />
                )}
                <div
                    className={`pb-1 pl-1 text-black font-pixel text-[10px] ${
                        open ? "bg-black text-white" : "text-black"
                    }`}
                >
                    {folderName}
                </div>
            </div>
            {open ? (
                projects.map((project) => (
                    <div
                        key={project.slug}
                        className="flex flex-col items-center justify-center gap-4"
                        onMouseEnter={() => setSelectedIcon(project.slug)}
                        onMouseLeave={() => setSelectedIcon("")}
                    >
                        <Image
                            alt="folder"
                            src={`/project_icons/${project.slug}.png`}
                            width={ICON_SIZE}
                            height={ICON_SIZE}
                            //onClick={}
                        />
                        <div
                            className={`font-pixel text-[10px] pb-1 px-1 ${
                                selectedIcon == project.slug
                                    ? "text-white bg-black"
                                    : "text-black"
                            }`}
                            key={project.title}
                        >
                            {project.title}
                        </div>
                    </div>
                ))
            ) : (
                <div />
            )}
        </div>
    );
};

export default Folder;
