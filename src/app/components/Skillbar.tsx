interface SkillbarProps {
    level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
}

const Skillbar: React.FC<SkillbarProps> = ({ level }) => {
    const getFilledSections = () => {
        switch (level) {
            case "BEGINNER":
                return 1;
            case "INTERMEDIATE":
                return 2;
            case "ADVANCED":
                return 3;
            default:
                return 0;
        }
    };

    const filledSections = getFilledSections();

    return (
        <div className="flex gap-1">
            {[1, 2, 3].map((section) => (
                <div
                    key={section}
                    className={`h-2 flex-1 ${
                        section <= filledSections ? "bg-black" : "bg-gray-200"
                        // } ${
                        //     section === 1
                        //         ? "rounded-l-md"
                        //         : section === 3
                        //         ? "rounded-r-md"
                        //         : ""
                    }`}
                />
            ))}
        </div>
    );
};

export default Skillbar;
