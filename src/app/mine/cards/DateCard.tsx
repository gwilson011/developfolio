"use client";
import { CircularProgressWithLabel } from "../../components/CircularProgressWithLabel";

const DateCard = () => {
    return (
        <div className="border-default rounded p-10 text-black text-center">
            <div className="flex flex-col gap-2">
                <span className="font-tango text-[40pt] leading-none">
                    {new Date()
                        .toLocaleDateString("en-US", {
                            weekday: "short",
                        })
                        .toUpperCase()}
                </span>
                <span className="font-louis text-lg">
                    {new Date().toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    })}
                </span>
            </div>
        </div>
    );
};

export default DateCard;
