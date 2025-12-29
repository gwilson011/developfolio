"use client";
import { useEffect, useState, useRef } from "react";

const VocabCard = () => {
    const [wordOfTheDay, setWordOfTheDay] = useState<string | null>(null);
    const [definition, setDefinition] = useState<string | null>(null);
    const [examples, setExamples] = useState<string[]>([]);
    const [partOfSpeech, setPartOfSpeech] = useState<string | null>(null);
    const [hyphenation, setHyphenation] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const uploadedWord = useRef<string | null>(null);

    // Quiz state
    const [quizMode, setQuizMode] = useState(false);
    const [yesterdayWord, setYesterdayWord] = useState<{
        id: string;
        word: string;
        examples: string[];
        definition: string;
    } | null>(null);
    const [quizOptions, setQuizOptions] = useState<string[]>([]);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [quizFeedback, setQuizFeedback] = useState<{
        show: boolean;
        correct: boolean;
        message: string;
    } | null>(null);
    const [selectedExample, setSelectedExample] = useState("");

    // Helper: Get today's date in local timezone
    const getLocalDateString = (): string => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    // Helper: Fetch today's word from Wordnik
    const fetchTodaysWord = async () => {
        try {
            console.log("[Today's Word] Fetching from Wordnik...");
            const response = await fetch("/api/wordnik/wordoftheday");
            const result = await response.json();
            console.log("[Today's Word] Wordnik response:", result);

            if (result.ok && result.data) {
                setWordOfTheDay(result.data.word);
                setDefinition(result.data.definition);
                setExamples(result.data.examples);
                setHyphenation(result.data.hyphenation);
                setPartOfSpeech(result.data.pos);

                // Upload to Notion only if we haven't uploaded this word yet
                if (uploadedWord.current !== result.data.word) {
                    uploadedWord.current = result.data.word;
                    console.log("[Today's Word] Uploading to Notion...");

                    fetch("/api/notion/words/add", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            word: result.data.word,
                            definition: result.data.definition,
                            examples: result.data.examples,
                            date: getLocalDateString(),
                        }),
                    })
                        .then((res) => res.json())
                        .then((notionResult) =>
                            console.log(
                                "[Today's Word] Notion upload result:",
                                notionResult
                            )
                        )
                        .catch((err) =>
                            console.warn(
                                "[Today's Word] ⚠️ Notion upload failed:",
                                err
                            )
                        );
                } else {
                    console.log(
                        "[Today's Word] Already uploaded this word, skipping"
                    );
                }
            } else {
                setError(result.error || "Failed to fetch word data");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        }
    };

    // Helper: Blank out word in sentence with underscores
    const blankWordInSentence = (
        sentence: string,
        targetWord: string
    ): string => {
        const regex = new RegExp(`\\b${targetWord}\\b`, "gi");
        return sentence.replace(regex, (match) => "_".repeat(match.length));
    };

    // Helper: Handle quiz answer selection
    const handleAnswerSelection = async (selectedWord: string) => {
        console.log("[Quiz] User selected:", selectedWord);
        console.log("[Quiz] Correct answer:", yesterdayWord?.word);
        setSelectedAnswer(selectedWord);

        if (selectedWord.toLowerCase() === yesterdayWord?.word.toLowerCase()) {
            // Correct answer!
            console.log("[Quiz] ✓ Correct answer!");
            setQuizFeedback({
                show: true,
                correct: true,
                message: "Correct!",
            });

            // Mark word as learned in Notion
            try {
                console.log("[Quiz] Marking word as learned in Notion...");
                const response = await fetch(
                    "/api/notion/words/update-learned",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            wordId: yesterdayWord.id,
                            learned: true,
                        }),
                    }
                );
                const result = await response.json();
                console.log("[Quiz] Update learned response:", result);

                // Transition to today's word after 2s
                console.log("[Quiz] Transitioning to today's word in 2s...");
                setTimeout(async () => {
                    setQuizMode(false);
                    setQuizFeedback(null);
                    console.log("[Quiz] Fetching today's word...");
                    await fetchTodaysWord();
                }, 2000);
            } catch (err) {
                console.error(
                    "[Quiz] ❌ Failed to update learned status:",
                    err
                );
            }
        } else {
            // Incorrect answer
            console.log("[Quiz] ✗ Incorrect answer. Try again!");
            setQuizFeedback({
                show: true,
                correct: false,
                message: "Try again!",
            });

            // Reset after 1.5s to allow retry
            setTimeout(() => {
                console.log("[Quiz] Resetting for retry...");
                setSelectedAnswer(null);
                setQuizFeedback(null);
            }, 1500);
        }
    };

    useEffect(() => {
        const initializeVocabCard = async () => {
            try {
                setLoading(true);
                console.log("[VocabCard] Initializing...");

                // Check if yesterday's word exists and is not learned
                console.log("[VocabCard] Checking for yesterday's word...");
                const yesterdayResponse = await fetch(
                    "/api/notion/words/yesterday"
                );
                const yesterdayData = await yesterdayResponse.json();
                console.log(
                    "[VocabCard] Yesterday's word response:",
                    yesterdayData
                );

                if (
                    yesterdayData.ok &&
                    yesterdayData.found &&
                    !yesterdayData.data.learned
                ) {
                    console.log(
                        "[VocabCard] ✓ Quiz mode activated! Word:",
                        yesterdayData.data.word
                    );

                    // Enter quiz mode
                    setYesterdayWord(yesterdayData.data);

                    // Fetch random decoy words
                    console.log("[VocabCard] Fetching random decoy words...");
                    const randomResponse = await fetch(
                        `/api/notion/words/random?exclude=${yesterdayData.data.word}&count=2`
                    );
                    const randomData = await randomResponse.json();
                    console.log(
                        "[VocabCard] Random words response:",
                        randomData
                    );

                    if (randomData.ok && randomData.data.length >= 2) {
                        // Create shuffled quiz options
                        const options = [
                            yesterdayData.data.word,
                            ...randomData.data,
                        ].sort(() => Math.random() - 0.5);

                        console.log("[VocabCard] Quiz options:", options);
                        console.log(
                            "[VocabCard] Correct answer:",
                            yesterdayData.data.word
                        );
                        console.log(
                            "[VocabCard] Example sentence:",
                            yesterdayData.data.examples[0]
                        );

                        setQuizOptions(options);
                        setSelectedExample(
                            yesterdayData.data.examples[0] ||
                                yesterdayData.data.definition
                        );
                        setQuizMode(true);
                    } else {
                        // Not enough words for quiz - show today's word
                        console.warn(
                            "[VocabCard] ⚠️ Not enough words for quiz, skipping to today's word"
                        );
                        await fetchTodaysWord();
                    }
                } else {
                    // No quiz needed - show today's word
                    if (!yesterdayData.found) {
                        console.log(
                            "[VocabCard] ℹ️ No yesterday word found (first day?). Showing today's word."
                        );
                    } else if (yesterdayData.data.learned) {
                        console.log(
                            "[VocabCard] ℹ️ Yesterday's word already learned. Showing today's word."
                        );
                    }
                    await fetchTodaysWord();
                }
            } catch (err) {
                console.error("[VocabCard] ❌ Error initializing:", err);
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        };

        initializeVocabCard();
    }, []);

    return (
        <div className="border-default rounded p-8 text-black max-w-[320px]">
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
            ) : quizMode ? (
                <div className="flex flex-col gap-4">
                    <div className="font-louis text-base italic text-gray-700 border-l-2 border-gray-300 pl-3">
                        {blankWordInSentence(
                            selectedExample,
                            yesterdayWord?.word || ""
                        )}
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                        {quizOptions.map((option) => (
                            <button
                                key={option}
                                onClick={() => handleAnswerSelection(option)}
                                disabled={!!selectedAnswer}
                                className={`
                                    p-3 border-default font-louis text-sm transition-colors duration-200
                                    ${
                                        selectedAnswer === option
                                            ? quizFeedback?.correct
                                                ? "bg-green-100 border-green-500"
                                                : "bg-red-100 border-red-500"
                                            : "bg-white hover:bg-black hover:text-white"
                                    }
                                    ${
                                        selectedAnswer &&
                                        selectedAnswer !== option
                                            ? "opacity-50"
                                            : ""
                                    }
                                `}
                            >
                                {option}
                            </button>
                        ))}
                    </div>

                    {quizFeedback?.show && (
                        <div
                            className={`font-louis text-center text-sm font-semibold ${
                                quizFeedback.correct
                                    ? "text-green-600"
                                    : "text-red-600"
                            }`}
                        >
                            {quizFeedback.message}
                        </div>
                    )}
                </div>
            ) : wordOfTheDay && definition ? (
                <div className="flex flex-col gap-3">
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
