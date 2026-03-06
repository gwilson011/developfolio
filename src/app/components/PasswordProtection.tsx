"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { hasValidSession, saveSession } from "@/utils/session";

interface PasswordProtectionProps {
  children: React.ReactNode;
}

const SWIPE_THRESHOLD = 100;
const BOBODY_LETTERS = ["O", "B", "O", "D", "Y"];
const BIZNUS_LETTERS = ["I", "Z", "N", "U", "S"];

export default function PasswordProtection({ children }: PasswordProtectionProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);

  const startXRef = useRef(0);
  const bRowRef = useRef<HTMLDivElement>(null);

  // Check for existing session on mount
  useEffect(() => {
    const hasSession = hasValidSession();
    setIsAuthenticated(hasSession);
    setIsLoading(false);
  }, []);

  const handleDragStart = useCallback((clientX: number) => {
    setIsDragging(true);
    startXRef.current = clientX;
  }, []);

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging) return;

    const deltaX = clientX - startXRef.current;
    const progress = Math.max(0, Math.min(deltaX, SWIPE_THRESHOLD));
    setSwipeProgress(progress);
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;

    if (swipeProgress >= SWIPE_THRESHOLD) {
      setIsRevealed(true);
      setSwipeProgress(SWIPE_THRESHOLD);

      // Brief delay before unlocking to show the revealed word
      setTimeout(() => {
        const token = `swipe_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        saveSession(token);
        setIsAuthenticated(true);
      }, 800);
    } else {
      setSwipeProgress(0);
    }

    setIsDragging(false);
  }, [isDragging, swipeProgress]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  }, [handleDragStart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleDragMove(e.clientX);
  }, [handleDragMove]);

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  }, [handleDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX);
  }, [handleDragMove]);

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Global mouse event listeners for drag tracking
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <p className="font-louis text-lg">Loading...</p>
      </div>
    );
  }

  // Show swipe lock screen if not authenticated
  if (!isAuthenticated) {
    const revealProgress = isRevealed ? 1 : swipeProgress / SWIPE_THRESHOLD;

    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="select-none">
          <div className="flex flex-col items-start">
            {/* B row - swipeable */}
            <div
              ref={bRowRef}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="relative py-2"
              style={{ touchAction: "none" }}
            >
              <span className="font-tango text-4xl text-black">
                B
              </span>

              {/* IZNUS reveal - positioned absolutely so it doesn't shift layout */}
              <div
                className="absolute left-full top-1/2 -translate-y-1/2 overflow-hidden flex"
                style={{
                  width: isRevealed ? "auto" : `${revealProgress * 120}px`,
                  opacity: revealProgress,
                  transition: isRevealed ? "all 0.3s ease-out" : "none",
                }}
              >
                {BIZNUS_LETTERS.map((letter, index) => (
                  <span
                    key={index}
                    className="font-tango text-4xl text-black"
                    style={{
                      opacity: revealProgress,
                      transform: `translateX(${(1 - revealProgress) * -10}px)`,
                      transition: isRevealed ? `all 0.3s ease-out ${index * 0.05}s` : "none",
                    }}
                  >
                    {letter}
                  </span>
                ))}
              </div>
            </div>

            {/* Remaining OBODY letters */}
            {BOBODY_LETTERS.map((letter, index) => (
              <div
                key={index}
                className="flex items-center justify-center py-2"
              >
                <span className="font-tango text-4xl text-black">
                  {letter}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - show protected content
  return <>{children}</>;
}
