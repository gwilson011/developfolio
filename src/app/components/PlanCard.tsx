"use client";

interface PlanCardProps {
    name: string;
    week: string;
    dailyCalories: number;
    ingredientCount: number;
    uniqueMealCount: number;
    onLoadPlan?: (week: string, updateToCurrentWeek: boolean) => void;
    isLoading?: boolean;
}

const PlanCard = ({
    name,
    week,
    dailyCalories,
    ingredientCount,
    uniqueMealCount,
    onLoadPlan,
    isLoading = false,
}: PlanCardProps) => {
    return (
        <div className="border-default p-4 rounded text-black flex flex-col md:flex-row items-center justify-between w-full gap-2">
            <div className="flex flex-col gap-1">
                <span className="font-tango text-lg">{name}</span>
                <span className="font-louis text-sm text-gray-600">
                    Week of {week}
                </span>
            </div>
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center">
                <div className="flex flex-row gap-6 items-center">
                    <div className="text-center">
                        <div className="font-pixel text-sm text-black">
                            {dailyCalories}
                        </div>
                        <div className="font-louis text-xs text-gray-600">
                            cal/day
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="font-pixel text-sm text-black">
                            {ingredientCount}
                        </div>
                        <div className="font-louis text-xs text-gray-600">
                            ingredients
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="font-pixel text-sm text-black">
                            {uniqueMealCount}
                        </div>
                        <div className="font-louis text-xs text-gray-600">
                            meals
                        </div>
                    </div>
                </div>
                {onLoadPlan && (
                    <div className="flex flex-row gap-2">
                        <button
                            onClick={() => onLoadPlan(week, false)}
                            disabled={isLoading}
                            className="flex px-3 p-2 bg-white text-black font-pixel items-center justify-center text-xs hover:bg-gray-100 disabled:bg-gray-300 disabled:cursor-not-allowed border-default"
                        >
                            {isLoading ? "LOADING..." : "LOAD AS-IS"}
                        </button>
                        <button
                            onClick={() => onLoadPlan(week, true)}
                            disabled={isLoading}
                            className="flex px-3 p-2 bg-black text-white font-pixel items-center justify-center text-xs hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed border-default"
                        >
                            {isLoading ? "LOADING..." : "THIS WEEK"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlanCard;
