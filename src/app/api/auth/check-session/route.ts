import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { jwtVerify } from 'jose';

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

interface SessionData {
    username: string;
    sessionToken?: string;
}

export async function POST(request: Request) {
    try {
        // SECURITY: Rate limit session checks to prevent abuse
        const headersList = await headers();
        const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
        const now = Date.now();
        
        const attempts = checkAttempts.get(ip);
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
                checkAttempts.set(ip, { count: 1, resetAt: now + 60000 });
            }
        } else {
            checkAttempts.set(ip, { count: 1, resetAt: now + 60000 });
        }
        
        // Clean up old entries periodically
        if (Math.random() < 0.01) {
            for (const [key, value] of checkAttempts.entries()) {
                if (now > value.resetAt) checkAttempts.delete(key);
            }
        }
        
        // Get session from cookie and verify JWT
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get(SESSION_COOKIE);
        
        if (!sessionCookie) {
            return NextResponse.json({ valid: false, reason: 'no_session' });
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
        
        // Check database for current session token
        const supabase = await createClient();
        const { data: user, error } = await supabase
            .from('allowed_users')
            .select('session_token, device_info')
            .eq('username', session.username)
            .single();
        
        if (error || !user) {
            return NextResponse.json({ valid: false, reason: 'user_not_found' });
        }
        
        // If DB token doesn't match, session was invalidated
        if (user.session_token && user.session_token !== session.sessionToken) {
            // Session was kicked - get device info of new login
            const newDeviceInfo = user.device_info?.device || 'another device';
            
            // Delete the invalid session cookie
            cookieStore.delete(SESSION_COOKIE);
            
            return NextResponse.json({ 
                valid: false, 
                reason: 'kicked',
                newDeviceInfo 
            });
        }
        
        return NextResponse.json({ valid: true });
        
    } catch (error) {
        console.error('Session check error:', error);
        return NextResponse.json({ valid: false, reason: 'error' });
    }
}
