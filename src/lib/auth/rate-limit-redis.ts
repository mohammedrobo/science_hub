/**
 * Production-ready Rate Limiter using Upstash Redis
 * 
 * Features:
 * - Persistent across server restarts
 * - Works in serverless environments
 * - Supports sliding window algorithm
 * - Graceful fallback to in-memory if Redis unavailable
 * 
 * Setup:
 * 1. Create account at https://upstash.com
 * 2. Create Redis database
 * 3. Add to .env.local:
 *    UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
 *    UPSTASH_REDIS_REST_TOKEN=xxx
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// In-memory fallback for development/testing
import { 
    isRateLimited as memoryIsRateLimited, 
    recordFailedAttempt as memoryRecordFailedAttempt,
    clearAttempts as memoryClearAttempts,
    getRemainingLockout as memoryGetRemainingLockout
} from './rate-limit';

// Check if Redis is configured
const isRedisConfigured = () => {
    return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
};

// Create Redis client (lazy initialization)
let redis: Redis | null = null;
let loginRateLimiter: Ratelimit | null = null;
let apiRateLimiter: Ratelimit | null = null;

function getRedis(): Redis | null {
    if (!isRedisConfigured()) return null;
    
    if (!redis) {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL!,
            token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        });
    }
    return redis;
}

function getLoginRateLimiter(): Ratelimit | null {
    const r = getRedis();
    if (!r) return null;
    
    if (!loginRateLimiter) {
        loginRateLimiter = new Ratelimit({
            redis: r,
            // 5 login attempts per 15 minutes per IP+username
            limiter: Ratelimit.slidingWindow(5, '15 m'),
            analytics: true,
            prefix: 'ratelimit:login',
        });
    }
    return loginRateLimiter;
}

function getApiRateLimiter(): Ratelimit | null {
    const r = getRedis();
    if (!r) return null;
    
    if (!apiRateLimiter) {
        apiRateLimiter = new Ratelimit({
            redis: r,
            // 100 API requests per minute per user
            limiter: Ratelimit.slidingWindow(100, '1 m'),
            analytics: true,
            prefix: 'ratelimit:api',
        });
    }
    return apiRateLimiter;
}

// ============ LOGIN RATE LIMITING ============

export interface RateLimitResult {
    limited: boolean;
    remaining: number;
    resetInSeconds: number;
}

/**
 * Check if login attempt should be rate limited
 * Uses Redis if available, falls back to in-memory
 */
export async function checkLoginRateLimit(identifier: string): Promise<RateLimitResult> {
    const limiter = getLoginRateLimiter();
    
    if (!limiter) {
        // Fallback to in-memory
        const limited = memoryIsRateLimited(identifier);
        const resetIn = memoryGetRemainingLockout(identifier);
        return {
            limited,
            remaining: limited ? 0 : 5,
            resetInSeconds: resetIn
        };
    }
    
    try {
        const { success, remaining, reset } = await limiter.limit(identifier);
        return {
            limited: !success,
            remaining,
            resetInSeconds: Math.ceil((reset - Date.now()) / 1000)
        };
    } catch (error) {
        console.error('[RateLimit] Redis error, falling back to memory:', error);
        const limited = memoryIsRateLimited(identifier);
        return {
            limited,
            remaining: limited ? 0 : 5,
            resetInSeconds: memoryGetRemainingLockout(identifier)
        };
    }
}

/**
 * Record a failed login attempt
 */
export async function recordLoginFailure(identifier: string): Promise<void> {
    const limiter = getLoginRateLimiter();
    
    if (!limiter) {
        memoryRecordFailedAttempt(identifier);
        return;
    }
    
    // Upstash ratelimit already tracks this via limit() calls
    // But we can track failures separately for analytics
    const r = getRedis();
    if (r) {
        try {
            const key = `login:failures:${identifier}`;
            await r.incr(key);
            await r.expire(key, 900); // 15 minutes
        } catch (error) {
            console.error('[RateLimit] Failed to record failure:', error);
            memoryRecordFailedAttempt(identifier);
        }
    }
}

/**
 * Clear rate limit on successful login
 */
export async function clearLoginRateLimit(identifier: string): Promise<void> {
    const r = getRedis();
    
    if (!r) {
        memoryClearAttempts(identifier);
        return;
    }
    
    try {
        // Clear the failure counter
        await r.del(`login:failures:${identifier}`);
        // Note: Upstash sliding window doesn't support manual reset
        // but the limit will naturally expire
    } catch (error) {
        console.error('[RateLimit] Failed to clear rate limit:', error);
        memoryClearAttempts(identifier);
    }
}

// ============ API RATE LIMITING ============

/**
 * Check if API request should be rate limited
 */
export async function checkApiRateLimit(identifier: string): Promise<RateLimitResult> {
    const limiter = getApiRateLimiter();
    
    if (!limiter) {
        // No rate limiting in development without Redis
        return { limited: false, remaining: 100, resetInSeconds: 60 };
    }
    
    try {
        const { success, remaining, reset } = await limiter.limit(identifier);
        return {
            limited: !success,
            remaining,
            resetInSeconds: Math.ceil((reset - Date.now()) / 1000)
        };
    } catch (error) {
        console.error('[RateLimit] API rate limit error:', error);
        return { limited: false, remaining: 100, resetInSeconds: 60 };
    }
}

// ============ UTILITIES ============

/**
 * Get rate limit status (for debugging/admin)
 */
export async function getRateLimitStatus(): Promise<{
    provider: 'redis' | 'memory';
    configured: boolean;
}> {
    return {
        provider: isRedisConfigured() ? 'redis' : 'memory',
        configured: isRedisConfigured()
    };
}
