"use client";
import { useState } from "react";

interface MealCardProps {
    title: string;
    ingredients: string[];
    instructions: string;
    calories: number;
    servings: number;
}

const MealCard = ({
    title,
    ingredients,
    instructions,
    calories,
    servings,
}: MealCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="border-default p-4 rounded text-black space-y-3">
            <div className="flex flex-col gap-1">
                <span className="font-tango text-lg">{title}</span>
                <span className="font-louis text-xs text-gray-600">
                    {calories} cal • {servings} serving
                    {servings !== 1 ? "s" : ""}
                    <span
                        className="font-louis text-xs text-black cursor-pointer flex items-center justify-end gap-1"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <span>{isExpanded ? "▲" : "▼"}</span>
                    </span>
                </span>
            </div>

            {isExpanded && (
                <div className="space-y-2">
                    <div>
                        <span className="font-tango text-sm">Ingredients:</span>
                        <ul className="font-louis text-sm text-gray-700 mt-1">
                            {ingredients.map((ingredient, index) => (
                                <li key={index}>• {ingredient}</li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <span className="font-tango text-sm">
                            Instructions:
                        </span>
                        <p className="font-louis text-sm text-gray-700">
                            {instructions}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MealCard;
