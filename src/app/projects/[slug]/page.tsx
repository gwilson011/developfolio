"use client";
import { useParams } from "next/navigation";
import projects from "../../projects/projects.json";
import Navbar from "../../components/Navbar";
import Socialbar from "../../components/Socialbar";

export default function ProjectPage() {
    const { slug } = useParams();
    const project = projects.find((p) => p.slug === slug);

    if (!project) {
        return <div>Project not found</div>;
    }

    return (
        <div className="flex flex-col w-full h-full p-4 gap-4 md:gap-6">
            <Socialbar />
            <Navbar home={true} />
            <div className="flex flex-col gap-16 h-[calc(100vh-160px)] md:flex-row md:mr-24 md:ml-24">
                {/* Add your project detail layout here */}
                <h1>{project.title}</h1>
                {/* Add more project details */}
            </div>
        </div>
    );
}
