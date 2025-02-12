"use client";
import * as motion from "motion/react-client";
import type { Variants } from "motion/react";
import ProjectCard from "./ProjectCard";
import { useEffect, useState } from "react";

export default function ScrollTriggered() {
    const [projects, setProjects] = useState<Record<string, Project>>({});

    useEffect(() => {
        // Fetch projects from public folder
        fetch("/projects.json")
            .then((res) => res.json())
            .then((data) => setProjects(data))
            .catch((err) => console.error("Error loading projects:", err));
    }, []);

    return (
        <div style={container}>
            {Object.entries(projects).map(([key, p], i) => (
                <Card i={i} project={p} key={key} />
            ))}
        </div>
    );
}

interface Project {
    title: string;
    year: string;
    desc: string;
    image: string;
    href: { demo: string; repo: string };
}

interface CardProps {
    project: Project;
    i: number;
}

function Card({ project, i }: CardProps) {
    const background = "white";

    return (
        <motion.div
            className={`card-container-${i}`}
            style={cardContainer}
            initial="offscreen"
            whileInView="onscreen"
            exit="offscreen"
            viewport={{ once: false, amount: 0.3 }}
        >
            <div style={{ ...splash, background, opacity: 0.1 }} />
            <motion.div
                style={card}
                variants={cardVariants}
                whileHover={{
                    scale: 1.02,
                    transition: { duration: 0.2 },
                }}
                className="card"
            >
                <ProjectCard project={project} />
            </motion.div>
        </motion.div>
    );
}

const cardVariants: Variants = {
    offscreen: {
        y: 100,
        opacity: 0,
        transition: {
            type: "spring",
            bounce: 0.3,
            duration: 0.8,
        },
    },
    onscreen: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring",
            bounce: 0.3,
            duration: 1.2,
            delay: 0.2,
        },
    },
};

/**
 * ==============   Styles   ================
 */

const container: React.CSSProperties = {
    marginRight: "100px",
    marginLeft: "100px",
    maxWidth: 500,
    width: "100%",
    display: "flex",
    flexDirection: "column", // Stack cards vertically
    gap: 20, // Added gap between cards
};

const cardContainer: React.CSSProperties = {
    overflow: "hidden",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    padding: 15,
    marginBottom: 40, // Optional if you want to manually adjust spacing
    scrollSnapAlign: "center", // Snap when it reaches the top
};

const splash: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
};

const card: React.CSSProperties = {
    fontSize: 164,
    width: 500,
    height: 550,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    background: "black",
    boxShadow:
        "0px 4px 6px rgba(0, 0, 0, 0.1), 0px 10px 15px rgba(0, 0, 0, 0.15), 0px 20px 25px rgba(0, 0, 0, 0.2)",
};
