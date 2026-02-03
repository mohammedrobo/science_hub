'use server';

import { cookies } from 'next/headers';

const SESSION_COOKIE = 'sciencehub_session';

// Cache for DB verification to avoid checking on every request
// Key: username, Value: { verified: timestamp, valid: boolean }
const verificationCache = new Map<string, { verified: number; valid: boolean; sessionToken?: string }>();
const CACHE_TTL = 60 * 1000; // 1 minute cache for DB verification

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
    cookieStore.set(SESSION_COOKIE, JSON.stringify(data), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
    });
    
    // Clear cache for this user
    verificationCache.delete(data.username);
}

/**
 * Get current session
 */
import { createClient } from '@/lib/supabase/server';

/**
 * Get current session with cached DB verification
 * DB is only checked once per minute to avoid excessive queries
 */
export async function getSession(): Promise<SessionData | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);

    if (!sessionCookie) return null;

    try {
        const session = JSON.parse(sessionCookie.value) as SessionData;
        
        // Check cache first
        const cached = verificationCache.get(session.username);
        const now = Date.now();
        
        if (cached && (now - cached.verified) < CACHE_TTL) {
            // Use cached result
            if (!cached.valid) {
                await destroySession();
                return null;
            }
            // Check session token from cache
            if (cached.sessionToken && cached.sessionToken !== session.sessionToken) {
                await destroySession();
                return null;
            }
            return session;
        }

        // Verify against database (only if cache expired or missing)
        const supabase = await createClient();
        const { data: user } = await supabase
            .from('allowed_users')
            .select('is_first_login, access_role, username, session_token')
            .eq('username', session.username)
            .single();

        // Update cache
        if (!user) {
            verificationCache.set(session.username, { verified: now, valid: false });
            await destroySession();
            return null;
        }
        
        // Cache the verification result
        verificationCache.set(session.username, { 
            verified: now, 
            valid: true, 
            sessionToken: user.session_token 
        });

        // Single Session Enforcement:
        if (user.session_token && user.session_token !== session.sessionToken) {
            await destroySession();
            return null;
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
