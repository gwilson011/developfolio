"use client";

interface Story {
    year: string;
    title: string;
    content: string;
    image: string;
}

interface StoryPoint {
    story: Story;
}

const StoryCard = ({ story }: StoryPoint) => {
    return (
        <div
            className="flex h-full space-y-4 gap-5 text-black p-4 justify-between" //hover:text-white hover:bg-black"
        >
            <div className="flex flex-col min-w-[250px] justify-start gap-3 h-full p-5">
                <span className="flex text-black font-tango text-2xl">
                    {story.title}
                </span>{" "}
                <span className="flex text-black font-louis text-md">
                    {story.content}
                </span>
            </div>
        </div>
    );
};

export default StoryCard;
