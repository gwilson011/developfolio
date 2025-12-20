"use client";

const DateCard = () => {
    return (
        <div className="border-default rounded p-4 text-black text-center">
            <div className="flex flex-col gap-1">
                <span className="font-tango text-[80pt] leading-none">
                    {new Date()
                        .toLocaleDateString("en-US", {
                            weekday: "short",
                        })
                        .toUpperCase()}
                </span>
                <span className="block font-pixel text-[10pt] leading-none py-1 text-center">
                    {new Date()
                        .toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                        })
                        .toUpperCase()}
                </span>
            </div>
        </div>
    );
};

export default DateCard;
