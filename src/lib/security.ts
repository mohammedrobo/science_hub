// Security utilities for input validation and sanitization

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .trim();
}

/**
 * Validate and sanitize username
 * Only allows alphanumeric and underscore
 */
export function sanitizeUsername(input: string): string {
    return input
        .replace(/[^a-zA-Z0-9_]/g, '')
        .substring(0, 50)
        .toLowerCase();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
}

/**
 * Check if string contains suspicious patterns
 */
export function containsSuspiciousPatterns(input: string): boolean {
    const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+=/i,
        /data:/i,
        /vbscript:/i,
        /expression\(/i,
        /eval\(/i,
        /onclick/i,
        /onerror/i,
        /onload/i,
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(input));
}

/**
 * Truncate string to max length safely
 */
export function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength);
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Rate limiter response headers
 */
export function rateLimitHeaders(remaining: number, resetIn: number) {
    return {
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(Date.now() / 1000 + resetIn).toString(),
    };
}

/**
 * Security headers for API responses
 */
export const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
};
