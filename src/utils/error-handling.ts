// Centralized error handling utilities for meal planning system

import { NextResponse } from 'next/server';
import { MEAL_PLAN_CONFIG } from '@/config/meal-plan';

export interface APIError {
    message: string;
    status: number;
    context?: string;
    details?: unknown;
}

export interface SafeOperationResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    details?: unknown;
}

/**
 * Standardized API error handler for consistent error responses
 */
export function handleAPIError(
    error: unknown,
    context: string,
    fallbackMessage: string = "An unexpected error occurred"
): NextResponse {
    console.error(`[${context}] Error:`, error);

    // Handle different error types
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return NextResponse.json(
            {
                ok: false,
                error: "Invalid JSON format",
                context,
                details: error.message
            },
            { status: 400 }
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorWithResponse = error as any;
    if (errorWithResponse?.response?.status) {
        // OpenAI API errors
        return NextResponse.json(
            {
                ok: false,
                error: "External API error",
                context,
                details: errorWithResponse.response.data || errorWithResponse.message
            },
            { status: errorWithResponse.response.status >= 500 ? 503 : 400 }
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorWithStatus = error as any;
    if (errorWithStatus?.status) {
        // Custom API errors
        return NextResponse.json(
            {
                ok: false,
                error: errorWithStatus.message || fallbackMessage,
                context
            },
            { status: errorWithStatus.status }
        );
    }

    // Generic server error
    return NextResponse.json(
        {
            ok: false,
            error: fallbackMessage,
            context,
            details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
        },
        { status: 500 }
    );
}

/**
 * Safe execution wrapper for async operations with fallback values
 */
export async function safeAsyncOperation<T>(
    operation: () => Promise<T>,
    fallback: T,
    context: string = "async operation"
): Promise<SafeOperationResult<T>> {
    try {
        const result = await operation();
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error(`[${context}] Error:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            details: error,
            data: fallback
        };
    }
}

/**
 * Safe JSON parsing with fallback
 */
export function safeJsonParse<T>(
    jsonString: string,
    fallback: T,
    context: string = "JSON parsing"
): SafeOperationResult<T> {
    try {
        const parsed = JSON.parse(jsonString);
        return {
            success: true,
            data: parsed
        };
    } catch (error) {
        console.error(`[${context}] JSON parse error:`, error);
        return {
            success: false,
            error: "Invalid JSON format",
            details: error,
            data: fallback
        };
    }
}

/**
 * Validates environment variables and returns standardized error response
 */
export function validateEnvironment(
    requiredVars: string[],
    context: string
): NextResponse | null {
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        console.error(`[${context}] Missing environment variables:`, missingVars);
        return NextResponse.json(
            {
                ok: false,
                error: `Missing required environment variables: ${missingVars.join(', ')}`,
                context
            },
            { status: 500 }
        );
    }

    return null;
}

/**
 * Validates request parameters against constraints from config
 */
export function validateCalories(
    calories: unknown,
    context: string
): NextResponse | null {
    if (!calories || typeof calories !== "number") {
        return NextResponse.json(
            {
                ok: false,
                error: "dailyCalories must be a number",
                context
            },
            { status: 400 }
        );
    }

    if (calories < MEAL_PLAN_CONFIG.CONSTRAINTS.min_daily_calories ||
        calories > MEAL_PLAN_CONFIG.CONSTRAINTS.max_daily_calories) {
        return NextResponse.json(
            {
                ok: false,
                error: `dailyCalories must be between ${MEAL_PLAN_CONFIG.CONSTRAINTS.min_daily_calories} and ${MEAL_PLAN_CONFIG.CONSTRAINTS.max_daily_calories}`,
                context
            },
            { status: 400 }
        );
    }

    return null;
}

/**
 * Clean up OpenAI response content (remove markdown, trim)
 */
export function cleanAIResponse(content: string): string {
    return content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
}

/**
 * Retry wrapper for operations that might fail temporarily
 */
export async function withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = MEAL_PLAN_CONFIG.API.retry_attempts,
    context: string = "operation"
): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            console.warn(`[${context}] Attempt ${attempt}/${maxAttempts} failed:`, error);

            if (attempt < maxAttempts) {
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }

    throw lastError;
}

/**
 * Timeout wrapper for operations
 */
export function withTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number,
    context: string = "operation"
): Promise<T> {
    return Promise.race([
        operation,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`${context} timed out after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
}