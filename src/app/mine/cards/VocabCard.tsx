"use client";
import { useEffect, useState } from "react";

const VocabCard = () => {
    const [wordOfTheDay, setWordOfTheDay] = useState<string | null>(null);
    const [definition, setDefinition] = useState<string | null>(null);
    const [partOfSpeech, setPartOfSpeech] = useState<string | null>(null);
    const [hyphenation, setHyphenation] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchWordOfTheDay = async () => {
            try {
                setLoading(true);
                const response = await fetch("/api/wordnik/wordoftheday", {
                    cache: "no-store",
                });
                const result = await response.json();

                if (result.ok && result.data) {
                    setWordOfTheDay(result.data.word);
                    setDefinition(result.data.definition);
                    setHyphenation(result.data.hyphenation);
                    setPartOfSpeech(result.data.pos);
                } else {
                    setError(result.error || "Failed to fetch word data");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        };

        fetchWordOfTheDay();
    }, []);

    return (
        <div className="border-default rounded p-8 text-black md:max-w-[320px]">
            {loading ? (
                <div className="flex items-center justify-center min-h-[200px]">
                    <span className="font-louis text-lg">Loading...</span>
                </div>
            ) : error ? (
                <div className="flex items-center justify-center min-h-[200px]">
                    <span className="font-louis text-sm text-red-600">
                        Error: {error}
                    </span>
                </div>
            ) : wordOfTheDay && definition ? (
                <div className="flex flex-col gap-3 items-center">
                    <span className="font-pixel text-[15pt] leading-none">
                        {hyphenation.map((s) => s.toUpperCase()).join("·")}
                    </span>
                    <span className="font-louis text-[12pt] text-gray-500 leading-none">
                        {partOfSpeech}
                    </span>
                    <span className="font-louis text-md ml-4">
                        {definition}
                    </span>
                </div>
            ) : (
                <div className="flex items-center justify-center min-h-[200px]">
                    <span className="font-louis text-lg">
                        No word data available
                    </span>
                </div>
            )}
        </div>
    );
};

export default VocabCard;
