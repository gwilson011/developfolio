// src/types/project.ts

export interface Project {
    title: string;
    slug: string;
    year: string;
    desc: string;
    image: string;
    href: {
        demo: string;
        repo: string;
    };
    languages: string[];
    technologies: string[];
}

export type ProjectCategories = {
    personal?: Project[];
    clubs?: Project[];
    school?: Project[];
    work?: Project[];
};
