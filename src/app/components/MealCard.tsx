"use client";
import { useState } from "react";

interface MealCardProps {
    title: string;
    ingredients: string[];
    instructions: string;
    calories: number;
    servings: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    mealType?: string[];
    tags?: string[];
    isSelected?: boolean;
    onSelect?: () => void;
}

const MealCard = ({
    title,
    ingredients,
    instructions,
    calories,
    servings,
    protein = 0,
    carbs = 0,
    fat = 0,
    fiber = 0,
    mealType = [],
    tags = [],
    isSelected = false,
    onSelect,
}: MealCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isEatingOut = title === "Eating Out";
    const hasRecipeData = calories > 0 && ingredients.length > 0;

    return (
        <div
            className={`border-default p-4 rounded space-y-3 cursor-pointer ${
                isSelected
                    ? "bg-black text-white"
                    : isEatingOut
                    ? "bg-gray-100 text-gray-600"
                    : "bg-white text-black"
            }`}
            onClick={onSelect}
        >
            <div className="flex flex-col gap-1">
                <span className="font-tango text-lg">{title}</span>
                {hasRecipeData ? (
                    <div className="flex flex-col gap-1">
                        <span
                            className={`font-louis text-xs ${
                                isSelected
                                    ? "text-gray-300"
                                    : isEatingOut
                                    ? "text-gray-500"
                                    : "text-gray-600"
                            }`}
                        >
                            {calories} cal • {servings} serving
                            {servings !== 1 ? "s" : ""}
                        </span>
                        <span
                            className={`flex justify-between font-louis text-xs text-zinc-400 ${
                                isSelected
                                    ? "text-gray-300"
                                    : isEatingOut
                                    ? "text-gray-500"
                                    : "text-gray-600"
                            }`}
                        >
                            {protein}g p • {carbs}g c • {fat}g f
                            <span
                                className={`font-louis text-xs cursor-pointer ml-2 ${
                                    isSelected ? "text-white" : "text-black"
                                }`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsExpanded(!isExpanded);
                                }}
                            >
                                {isExpanded ? "▲" : "▼"}
                            </span>
                        </span>
                    </div>
                ) : (
                    <span
                        className={`font-louis text-xs ${
                            isSelected
                                ? "text-gray-300"
                                : isEatingOut
                                ? "text-gray-500"
                                : "text-gray-600"
                        }`}
                    >
                        {isEatingOut ? "Dining out" : "No recipe data"}
                    </span>
                )}
            </div>

            {/* Tags Section */}
            {(mealType.length > 0 || tags.length > 0) && (
                <div className="flex flex-wrap gap-1">
                    {mealType.map((type, index) => (
                        <span
                            key={index}
                            className={`px-2 py-1 rounded text-xs font-louis ${
                                isSelected
                                    ? "bg-gray-600 text-white"
                                    : "bg-gray-800 text-white"
                            }`}
                        >
                            {type}
                        </span>
                    ))}
                    {tags.map((tag, index) => (
                        <span
                            key={index}
                            className={`px-2 py-1 rounded text-xs font-louis ${
                                isSelected
                                    ? "bg-gray-400 text-black"
                                    : "bg-gray-200 text-gray-800"
                            }`}
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {isExpanded && hasRecipeData && (
                <div className="space-y-2">
                    <div>
                        <span className="font-tango text-sm">Nutrition:</span>
                        <div
                            className={`font-louis text-sm mt-1 ${
                                isSelected ? "text-gray-300" : "text-gray-700"
                            }`}
                        >
                            <div>• Calories: {calories}</div>
                            <div>• Protein: {protein}g</div>
                            <div>• Carbs: {carbs}g</div>
                            <div>• Fat: {fat}g</div>
                            <div>• Fiber: {fiber}g</div>
                        </div>
                    </div>

                    <div>
                        <span className="font-tango text-sm">Ingredients:</span>
                        <ul
                            className={`font-louis text-sm mt-1 ${
                                isSelected ? "text-gray-300" : "text-gray-700"
                            }`}
                        >
                            {ingredients.map((ingredient, index) => (
                                <li key={index}>• {ingredient}</li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <span className="font-tango text-sm">
                            Instructions:
                        </span>
                        <p
                            className={`font-louis text-sm ${
                                isSelected ? "text-gray-300" : "text-gray-700"
                            }`}
                        >
                            {instructions}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MealCard;
