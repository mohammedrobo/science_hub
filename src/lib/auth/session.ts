'use server';

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const SESSION_COOKIE = 'sciencehub_session';

// HMAC secret for signing session cookies
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET environment variable is required in production');
}
const SESSION_SECRET = new TextEncoder().encode(
    process.env.SESSION_SECRET || 'dev-only-secret-do-not-use-in-production-32!'
);

// Cache for DB verification to avoid checking on every request
const verificationCache = new Map<string, { verified: number; valid: boolean }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface SessionData {
    username: string;
    name: string;
    group: string;
    section: string;
    role: string;
    isFirstLogin: boolean;
    hasOnboarded?: boolean;
    loggedInAt: string;
    sessionToken?: string;
}

/**
 * Sign session data into a JWT
 */
async function signSession(data: SessionData): Promise<string> {
    return new SignJWT(data as unknown as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(SESSION_SECRET);
}

/**
 * Verify and decode a signed session JWT.
 * Returns null if signature is invalid or token is expired.
 */
async function verifySignedSession(token: string): Promise<SessionData | null> {
    try {
        const { payload } = await jwtVerify(token, SESSION_SECRET);
        return payload as unknown as SessionData;
    } catch {
        return null;
    }
}

/**
 * Create a signed session cookie
 */
export async function createSession(data: SessionData): Promise<void> {
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';

    const jwt = await signSession(data);

    cookieStore.set(SESSION_COOKIE, jwt, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
    });

    // Cache this session as valid
    if (data.sessionToken) {
        verificationCache.set(data.sessionToken, { verified: Date.now(), valid: true });
    }
}

/**
 * Get current session - verifies JWT signature first
 */
import { createClient } from '@/lib/supabase/server';

export async function getSession(): Promise<SessionData | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);

    if (!sessionCookie) return null;

    // Verify JWT signature — only signed sessions are accepted
    return verifySignedSession(sessionCookie.value);
}

/**
 * Verify session against database - only use for sensitive operations
 * This checks if the session token is still valid (not kicked by another login)
 */
export async function verifySessionWithDB(): Promise<SessionData | null> {
    const session = await getSession();
    if (!session) return null;

    try {
        // Check cache first (keyed by sessionToken for accuracy)
        if (session.sessionToken) {
            const cached = verificationCache.get(session.sessionToken);
            const now = Date.now();
            
            if (cached && (now - cached.verified) < CACHE_TTL) {
                if (!cached.valid) {
                    await destroySession();
                    return null;
                }
                return session;
            }
        }

        // Verify against database
        const supabase = await createClient();
        const { data: user } = await supabase
            .from('allowed_users')
            .select('is_first_login, access_role, username, session_token')
            .eq('username', session.username)
            .single();

        const now = Date.now();

        if (!user) {
            if (session.sessionToken) {
                verificationCache.set(session.sessionToken, { verified: now, valid: false });
            }
            await destroySession();
            return null;
        }
        
        // Single Session Enforcement: check if session token matches
        if (user.session_token && user.session_token !== session.sessionToken) {
            if (session.sessionToken) {
                verificationCache.set(session.sessionToken, { verified: now, valid: false });
            }
            await destroySession();
            return null;
        }

        // Cache as valid
        if (session.sessionToken) {
            verificationCache.set(session.sessionToken, { verified: now, valid: true });
        }

        // Update role if it changed
        if (user.access_role !== session.role) {
            session.role = user.access_role;
        }

        return session;
    } catch {
        return null;
    }
}

/**
 * Destroy session
 */
export async function destroySession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    
    // Note: Cache will be cleared on next login attempt
}

/**
 * Update session data
 */
export async function updateSession(updates: Partial<SessionData>): Promise<void> {
    const current = await getSession();
    if (!current) return;
    await createSession({ ...current, ...updates });
}

// Import and re-export password functions
import { hashPassword as _hashPassword, verifyPassword as _verifyPassword, isPasswordHashed as _isPasswordHashed } from './password';

export const hashPassword = _hashPassword;
export { _verifyPassword as verifyPassword };
export const isPasswordHashed = _isPasswordHashed;
