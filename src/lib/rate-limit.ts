// Simple in-memory rate limiter for API endpoints
// For production, use Redis-based rate limiting (see rate-limit-redis.ts)

interface RateLimitConfig {
    interval: number;  // Time window in ms
    maxRequests: number;  // Max requests per window
}

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

// In-memory store (cleared on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
        if (entry.resetAt < now) {
            rateLimitStore.delete(key);
        }
    }
}, 60000); // Clean every minute

export function rateLimit(config: RateLimitConfig) {
    return {
        async check(key: string): Promise<{ success: boolean; remaining: number }> {
            const now = Date.now();
            const entry = rateLimitStore.get(key);

            if (!entry || entry.resetAt < now) {
                // New window
                rateLimitStore.set(key, {
                    count: 1,
                    resetAt: now + config.interval
                });
                return { success: true, remaining: config.maxRequests - 1 };
            }

            if (entry.count >= config.maxRequests) {
                return { success: false, remaining: 0 };
            }

            // Increment counter
            entry.count++;
            return { success: true, remaining: config.maxRequests - entry.count };
        },

        async reset(key: string): Promise<void> {
            rateLimitStore.delete(key);
        }
    };
}
