"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import Socialbar from "../../components/Socialbar";

interface Project {
    title: string;
    slug: string;
    year: string;
    desc: string;
    image: string;
    href: { demo: string; repo: string };
}

export default function ProjectPage() {
    const { slug } = useParams();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/projects.json")
            .then((res) => res.json())
            .then((projects) => {
                const foundProject = projects.find(
                    (p: Project) => p.slug === slug
                );
                setProject(foundProject || null);
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
            <Navbar home={true} />
            <div className="flex flex-col gap-16 h-[calc(100vh-160px)] md:flex-row md:mr-24 md:ml-24">
                {/* Add your project detail layout here */}
                <h1>{project.title}</h1>
                {/* Add more project details */}
            </div>
        </div>
    );
}
