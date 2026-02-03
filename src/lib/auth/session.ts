'use server';

import { cookies } from 'next/headers';

const SESSION_COOKIE = 'sciencehub_session';

// Cache for DB verification to avoid checking on every request
// Key: sessionToken, Value: { verified: timestamp, valid: boolean }
const verificationCache = new Map<string, { verified: number; valid: boolean }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache for DB verification (extended from 1 min)

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
 * Create a session cookie
 */
export async function createSession(data: SessionData): Promise<void> {
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';
    
    cookieStore.set(SESSION_COOKIE, JSON.stringify(data), {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days (extended from 7)
        path: '/',
        // Don't set domain - let browser use current domain automatically
    });
    
    // Cache this session as valid
    if (data.sessionToken) {
        verificationCache.set(data.sessionToken, { verified: Date.now(), valid: true });
    }
    
    console.log(`[Session] Created session for ${data.username}`);
}

/**
 * Get current session
 */
import { createClient } from '@/lib/supabase/server';

/**
 * Get current session - FAST path trusts the cookie
 * DB verification only happens on sensitive actions via verifySessionWithDB()
 */
export async function getSession(): Promise<SessionData | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);

    if (!sessionCookie) return null;

    try {
        const session = JSON.parse(sessionCookie.value) as SessionData;
        return session;
    } catch {
        return null;
    }
}

/**
 * Verify session against database - only use for sensitive operations
 * This checks if the session token is still valid (not kicked by another login)
 */
export async function verifySessionWithDB(): Promise<SessionData | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);

    if (!sessionCookie) return null;

    try {
        const session = JSON.parse(sessionCookie.value) as SessionData;
        
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
export const verifyPassword = _verifyPassword;
export const isPasswordHashed = _isPasswordHashed;
