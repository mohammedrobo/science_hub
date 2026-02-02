'use server';

import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

const SESSION_COOKIE = 'sciencehub_session';
const SALT_ROUNDS = 12;

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
}

/**
 * Get current session
 */
import { createClient } from '@/lib/supabase/server';

/**
 * Get current session with DB verification
 */
export async function getSession(): Promise<SessionData | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);

    if (!sessionCookie) return null;

    try {
        const session = JSON.parse(sessionCookie.value) as SessionData;

        // Verify against database to catch resets/bans immediately
        const supabase = await createClient();
        const { data: user } = await supabase
            .from('allowed_users')
            .select('is_first_login, access_role, username')
            .eq('username', session.username)
            .single();

        // If user doesn't exist, invalidate session
        // Note: We DO NOT invalidate if is_first_login is true, because they need the session
        // to access /change-password. Middleware handles the redirection jail.
        if (!user) {
            // Force logout
            await destroySession();
            return null;
        }

        // Optional: Update role if it changed (demotion handling)
        if (user.access_role !== session.role) {
            // We could update the session, but for security, maybe just returning the updated role is safer?
            // Or just fail? Let's update the session object in memory at least.
            // Better behavior: If role changed (e.g. Leader -> Student), let's honor the DB role.
            session.role = user.access_role;
            // Optimistically update cookie? check later. For now, returning correct data is key.
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
}

/**
 * Update session data
 */
export async function updateSession(updates: Partial<SessionData>): Promise<void> {
    const current = await getSession();
    if (!current) return;
    await createSession({ ...current, ...updates });
}

/**
 * Hash a plaintext password
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    console.log(`[VerifyPassword] Input: "${password}" (len ${password.length})`);
    console.log(`[VerifyPassword] Stored: "${hash}" (len ${hash.length})`);

    // Backwards compatibility: if hash doesn't start with $2, it's plaintext
    if (!hash.startsWith('$2')) {
        const isMatch = password === hash;
        console.log(`[VerifyPassword] Plaintext comparison: ${isMatch}`);
        return isMatch;
    }
    const bcryptResult = await bcrypt.compare(password, hash);
    console.log(`[VerifyPassword] bcrypt comparison: ${bcryptResult}`);
    return bcryptResult;
}

/**
 * Check if password needs migration (is plaintext)
 */
export async function needsHashMigration(storedPassword: string): Promise<boolean> {
    return !storedPassword.startsWith('$2');
}
