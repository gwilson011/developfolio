"use client";
import { CircularProgressWithLabel } from "../../components/CircularProgressWithLabel";

const CycleCard = () => {
    return (
        <div className="border-default rounded p-10 text-black text-center">
            <CircularProgressWithLabel
                enableTrackSlot
                variant="determinate"
                value={70}
                size={160}
                thickness={4}
                color="inherit"
                label={
                    <div className="text-black flex flex-col gap-1">
                        <span className="font-tango text-[60pt] mb-[-30px]">
                            15
                        </span>
                        <span className="font-louis text-lg">day</span>
                    </div>
                }
                // style={{
                //     transform: "rotate(180deg)",
                // }}
            />
        </div>
    );
};

export default CycleCard;
