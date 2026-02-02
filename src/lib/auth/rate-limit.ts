/**
 * Simple in-memory rate limiter
 * For production, use Redis-based solution
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const attempts = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check if identifier is rate limited
 */
export function isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const entry = attempts.get(identifier);

    if (!entry) return false;
    if (now > entry.resetAt) {
        attempts.delete(identifier);
        return false;
    }

    return entry.count >= MAX_ATTEMPTS;
}

/**
 * Record a failed attempt
 */
export function recordFailedAttempt(identifier: string): void {
    const now = Date.now();
    const entry = attempts.get(identifier);

    if (!entry || now > entry.resetAt) {
        attempts.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    } else {
        entry.count++;
    }
}

/**
 * Clear attempts on successful login
 */
export function clearAttempts(identifier: string): void {
    attempts.delete(identifier);
}

/**
 * Get remaining lockout time in seconds
 */
export function getRemainingLockout(identifier: string): number {
    const entry = attempts.get(identifier);
    if (!entry) return 0;

    const remaining = Math.ceil((entry.resetAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
}
