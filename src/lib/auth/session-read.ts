/**
 * Session reader — NOT a server action.
 * 
 * This module provides read-only session access for server components (layouts, pages).
 * Unlike session.ts which uses 'use server' (making all exports server actions),
 * this file can be safely imported in server components without the overhead
 * and potential cookie-forwarding issues of server action RPC calls.
 */

import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SESSION_COOKIE = 'sciencehub_session';

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET environment variable is required in production');
}
const SESSION_SECRET = new TextEncoder().encode(
    process.env.SESSION_SECRET || 'dev-only-secret-do-not-use-in-production-32!'
);

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
 * Get current session from cookie — for use in server components only.
 * This is NOT a server action, so cookies are read directly during SSR.
 */
export async function readSession(): Promise<SessionData | null> {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get(SESSION_COOKIE);

        if (!sessionCookie) return null;

        // Verify JWT signature — only signed sessions are accepted
        const { payload } = await jwtVerify(sessionCookie.value, SESSION_SECRET);
        return payload as unknown as SessionData;
    } catch (err) {
        // JWT verification failed or cookie is missing/invalid
        if (err instanceof Error && !err.message.includes('cookies')) {
            // Don't log expected SSG/static rendering cookie errors
            console.error('[readSession] Failed to read session:', err);
        }
        return null;
    }
}
