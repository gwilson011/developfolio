"use client";
import { useState, useEffect } from "react";
import { hasValidSession, saveSession } from "@/utils/session";
import { AuthValidationResponse } from "@/app/types/auth";

interface PasswordProtectionProps {
  children: React.ReactNode;
}

export default function PasswordProtection({ children }: PasswordProtectionProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const hasSession = hasValidSession();
    setIsAuthenticated(hasSession);
    setIsLoading(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data: AuthValidationResponse = await response.json();

      if (data.ok && data.token) {
        saveSession(data.token);
        setIsAuthenticated(true);
        setPassword("");
      } else {
        setError(data.error || 'Invalid password');
        setPassword("");
      }
    } catch (err) {
      setError('Authentication failed. Please try again.');
      console.error('[PasswordProtection] Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <p className="font-louis text-lg">Loading...</p>
      </div>
    );
  }

  // Show password modal if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-white border-default p-8 rounded-md max-w-md w-full mx-4">
          <h2 className="font-tango text-2xl mb-4 text-black">Protected Page</h2>
          <p className="font-louis text-sm text-gray-600 mb-6">
            Please enter the password to access this page.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              {/* Hidden username field helps iOS password managers recognize this as a login form */}
              <input
                type="text"
                name="username"
                id="username"
                autoComplete="username"
                style={{ display: 'none' }}
                tabIndex={-1}
                aria-hidden="true"
              />
              <input
                type="password"
                name="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-2 border border-black border-[3px] rounded-md font-louis text-black focus:outline-none focus:ring-2 focus:ring-black"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-red-600 font-louis text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !password}
              className="w-full bg-black text-white font-louis py-2 px-4 rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Verifying...' : 'Access Page'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated - show protected content
  return <>{children}</>;
}
