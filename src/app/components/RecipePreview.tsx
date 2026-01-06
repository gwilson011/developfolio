"use client";
import { useState } from "react";
import { ParsedRecipeData, RecipeForNotion } from "@/app/types/recipe";

interface RecipePreviewProps {
    recipe: ParsedRecipeData;
    originalUrl: string;
    onSave: (recipe: RecipeForNotion) => void;
    onCancel: () => void;
    isSaving: boolean;
}

export default function RecipePreview({
    recipe,
    originalUrl,
    onSave,
    onCancel,
    isSaving,
}: RecipePreviewProps) {
    const [editedRecipe, setEditedRecipe] = useState<ParsedRecipeData>(recipe);

    const handleSave = () => {
        const recipeForNotion: RecipeForNotion = {
            name: editedRecipe.name,
            ingredients: editedRecipe.ingredients.join(", "),
            instructions: editedRecipe.instructions,
            servings: editedRecipe.servings,
            caloriesPerServing: editedRecipe.estimatedCalories,
            mealType: editedRecipe.mealTypes,
            tags: editedRecipe.tags,
            notes: editedRecipe.notes || "",
            url: originalUrl,
            approved: false, // Mark as not approved for review
        };
        onSave(recipeForNotion);
    };

    const updateIngredient = (index: number, value: string) => {
        const newIngredients = [...editedRecipe.ingredients];
        newIngredients[index] = value;
        setEditedRecipe({ ...editedRecipe, ingredients: newIngredients });
    };

    const addIngredient = () => {
        setEditedRecipe({
            ...editedRecipe,
            ingredients: [...editedRecipe.ingredients, ""],
        });
    };

    const removeIngredient = (index: number) => {
        const newIngredients = editedRecipe.ingredients.filter(
            (_, i) => i !== index
        );
        setEditedRecipe({ ...editedRecipe, ingredients: newIngredients });
    };

    return (
        <div className="flex flex-col gap-4 p-4 border-default rounded bg-white text-black">
            <div className="flex flex-row justify-between items-center">
                <h3 className="font-tango text-lg">Recipe Preview</h3>
                <div className="flex gap-2">
                    <button
                        onClick={onCancel}
                        className="flex items-center justify-center px-4 pt-3 pb-1 text-xs font-pixel border-default bg-white text-black hover:bg-black hover:text-white"
                    >
                        CANCEL
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center justify-center px-4 pt-3 pb-1 text-xs font-pixel border-default bg-black text-white hover:bg-white hover:text-black disabled:opacity-50"
                    >
                        {isSaving ? "SAVING..." : "SAVE TO NOTION"}
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                {/* Recipe Name */}
                <div>
                    <label className="font-pixel text-xs">NAME</label>
                    <input
                        className="w-full border-default p-2 rounded font-louis text-sm"
                        value={editedRecipe.name}
                        onChange={(e) =>
                            setEditedRecipe({
                                ...editedRecipe,
                                name: e.target.value,
                            })
                        }
                    />
                </div>

                {/* Servings and Calories */}
                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="font-pixel text-xs">SERVINGS</label>
                        <input
                            type="number"
                            className="w-full border-default p-2 rounded font-louis text-sm"
                            value={editedRecipe.servings}
                            onChange={(e) =>
                                setEditedRecipe({
                                    ...editedRecipe,
                                    servings: Number(e.target.value),
                                })
                            }
                            min="1"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="font-pixel text-xs">
                            CALORIES PER SERVING
                        </label>
                        <input
                            type="number"
                            className="w-full border-default p-2 rounded font-louis text-sm"
                            value={editedRecipe.estimatedCalories}
                            onChange={(e) =>
                                setEditedRecipe({
                                    ...editedRecipe,
                                    estimatedCalories: Number(e.target.value),
                                })
                            }
                            min="0"
                        />
                    </div>
                </div>

                {/* Ingredients */}
                <div>
                    <div className="flex justify-between items-end mb-2">
                        <label className="font-pixel text-xs">
                            INGREDIENTS
                        </label>
                        <button
                            onClick={addIngredient}
                            className="flex items-center justify-center px-4 pt-3 pb-1 text-xs font-pixel border-default bg-white text-black hover:bg-black hover:text-white"
                        >
                            + ADD
                        </button>
                    </div>
                    <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                        {editedRecipe.ingredients.map((ingredient, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    className="flex-1 border-default p-1 rounded font-louis text-sm"
                                    value={ingredient}
                                    onChange={(e) =>
                                        updateIngredient(index, e.target.value)
                                    }
                                    placeholder="Enter ingredient..."
                                />
                                <button
                                    onClick={() => removeIngredient(index)}
                                    className="flex items-center justify-center px-2 py-1 text-xs font-pixel border-default bg-white text-red-500 hover:bg-red-500 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Instructions */}
                <div>
                    <label className="font-pixel text-xs">INSTRUCTIONS</label>
                    <textarea
                        className="w-full border-default p-2 rounded font-louis text-sm h-32 resize-none"
                        value={editedRecipe.instructions}
                        onChange={(e) =>
                            setEditedRecipe({
                                ...editedRecipe,
                                instructions: e.target.value,
                            })
                        }
                        placeholder="Enter cooking instructions..."
                    />
                </div>

                {/* Tags and Meal Types */}
                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="font-pixel text-xs">MEAL TYPES</label>
                        <div className="flex flex-wrap gap-1">
                            {[
                                "breakfast",
                                "lunch",
                                "dinner",
                                "snack",
                                "dessert",
                            ].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => {
                                        const newTypes =
                                            editedRecipe.mealTypes.includes(
                                                type
                                            )
                                                ? editedRecipe.mealTypes.filter(
                                                      (t) => t !== type
                                                  )
                                                : [
                                                      ...editedRecipe.mealTypes,
                                                      type,
                                                  ];
                                        setEditedRecipe({
                                            ...editedRecipe,
                                            mealTypes: newTypes,
                                        });
                                    }}
                                    className={`flex items-center justify-center px-4 pt-3 pb-1 text-xs font-pixel border-default ${
                                        editedRecipe.mealTypes.includes(type)
                                            ? "bg-black text-white"
                                            : "bg-white text-black hover:bg-black hover:text-white"
                                    }`}
                                >
                                    {type.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label className="font-pixel text-xs">NOTES</label>
                    <textarea
                        className="w-full border-default p-2 rounded font-louis text-sm h-16 resize-none"
                        value={editedRecipe.notes || ""}
                        onChange={(e) =>
                            setEditedRecipe({
                                ...editedRecipe,
                                notes: e.target.value,
                            })
                        }
                        placeholder="Additional notes..."
                    />
                </div>

                {/* Confidence Score */}
                <div className="text-xs font-louis text-gray-600">
                    AI Confidence: {Math.round(editedRecipe.confidence * 100)}%
                </div>
            </div>
        </div>
    );
}
