import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { jwtVerify } from 'jose';
import { examModeValue } from '@/lib/exam-mode';

const SESSION_COOKIE = 'sciencehub_session';
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET environment variable is required in production');
}
const SESSION_SECRET = new TextEncoder().encode(
    process.env.SESSION_SECRET || 'dev-only-secret-do-not-use-in-production-32!'
);

// Rate limiting for session checks (in-memory, resets on restart)
const checkAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_CHECKS_PER_MINUTE = 30;
const verificationCache = new Map<string, {
    valid: boolean;
    checkedAt: number;
    reason?: string;
    newDeviceInfo?: string;
}>();
const VERIFICATION_CACHE_TTL_MS = examModeValue(
    90 * 1000,
    5 * 60 * 1000
); // 90s normal, 5m exam mode

interface SessionData {
    username: string;
    sessionToken?: string;
}

export async function POST() {
    try {
        // Read request context
        const headersList = await headers();
        const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
        const now = Date.now();

        // Get session cookie first so rate limiting can be keyed per-session (not per-shared IP)
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get(SESSION_COOKIE);

        if (!sessionCookie) {
            return NextResponse.json({ valid: false, reason: 'no_session' });
        }

        // SECURITY: Rate limit session checks to prevent abuse (scoped by IP + cookie fingerprint)
        // This avoids false throttling when many students share the same NAT/public IP.
        const cookieFingerprint = sessionCookie.value.slice(-24);
        const rateLimitKey = `${ip}:${cookieFingerprint}`;
        const attempts = checkAttempts.get(rateLimitKey);
        if (attempts) {
            if (now < attempts.resetAt) {
                if (attempts.count >= MAX_CHECKS_PER_MINUTE) {
                    return NextResponse.json(
                        { valid: false, reason: 'rate_limited' },
                        { status: 429 }
                    );
                }
                attempts.count++;
            } else {
                checkAttempts.set(rateLimitKey, { count: 1, resetAt: now + 60000 });
            }
        } else {
            checkAttempts.set(rateLimitKey, { count: 1, resetAt: now + 60000 });
        }

        // Clean up old entries periodically
        if (Math.random() < 0.01) {
            for (const [key, value] of checkAttempts.entries()) {
                if (now > value.resetAt) checkAttempts.delete(key);
            }
        }
        
        // Verify JWT signature — only signed sessions accepted
        let session: SessionData | null = null;
        try {
            const { payload } = await jwtVerify(sessionCookie.value, SESSION_SECRET);
            session = payload as unknown as SessionData;
        } catch {
            // Invalid/unsigned cookie — reject
            cookieStore.delete(SESSION_COOKIE);
            return NextResponse.json({ valid: false, reason: 'invalid_session' });
        }
        
        if (!session?.username || !session?.sessionToken) {
            return NextResponse.json({ valid: false, reason: 'invalid_session' });
        }

        const cacheKey = `${session.username}:${session.sessionToken}`;
        const cachedVerification = verificationCache.get(cacheKey);
        if (cachedVerification && (now - cachedVerification.checkedAt) < VERIFICATION_CACHE_TTL_MS) {
            if (!cachedVerification.valid) {
                cookieStore.delete(SESSION_COOKIE);
                return NextResponse.json({
                    valid: false,
                    reason: cachedVerification.reason || 'kicked',
                    newDeviceInfo: cachedVerification.newDeviceInfo
                });
            }
            return NextResponse.json({ valid: true });
        }
        
        // Check database for current session token
        const supabase = await createClient();
        const { data: user, error } = await supabase
            .from('allowed_users')
            .select('session_token, device_info')
            .eq('username', session.username)
            .single();
        
        if (error || !user) {
            verificationCache.set(cacheKey, {
                valid: false,
                reason: 'user_not_found',
                checkedAt: now
            });
            return NextResponse.json({ valid: false, reason: 'user_not_found' });
        }
        
        // If DB token doesn't match, session was invalidated
        if (user.session_token && user.session_token !== session.sessionToken) {
            // Session was kicked - get device info of new login
            const newDeviceInfo = user.device_info?.device || 'another device';
            
            // Delete the invalid session cookie
            cookieStore.delete(SESSION_COOKIE);
            verificationCache.set(cacheKey, {
                valid: false,
                reason: 'kicked',
                newDeviceInfo,
                checkedAt: now
            });
            
            return NextResponse.json({ 
                valid: false, 
                reason: 'kicked',
                newDeviceInfo 
            });
        }

        verificationCache.set(cacheKey, {
            valid: true,
            checkedAt: now
        });

        if (Math.random() < 0.01) {
            for (const [key, value] of verificationCache.entries()) {
                if ((now - value.checkedAt) > VERIFICATION_CACHE_TTL_MS * 3) {
                    verificationCache.delete(key);
                }
            }
        }
        
        return NextResponse.json({ valid: true });
        
    } catch (error) {
        console.error('Session check error:', error);
        return NextResponse.json({ valid: false, reason: 'error' });
    }
}
