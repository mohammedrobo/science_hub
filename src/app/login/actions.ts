'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import {
    createSession,
    getSession as getSecureSession,
    destroySession,
    updateSession,
    verifyPassword,
    hashPassword,
    needsHashMigration
} from '@/lib/auth/session';
import { isRateLimited, recordFailedAttempt, clearAttempts, getRemainingLockout } from '@/lib/auth/rate-limit';

interface LoginState {
    error?: string;
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
    const supabase = await createServiceRoleClient();

    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    if (!username || !password) {
        return { error: 'Username and password are required' };
    }

    // Get client IP for rate limiting
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimitKey = `login:${ip}:${username.trim().toLowerCase()}`;

    // Check rate limit
    if (isRateLimited(rateLimitKey)) {
        const remaining = getRemainingLockout(rateLimitKey);
        return { error: `Too many attempts. Try again in ${Math.ceil(remaining / 60)} minutes.` };
    }

    // 1. Check credentials against allowed_users table
    const { data: user, error: userError } = await supabase
        .from('allowed_users')
        .select('*')
        .ilike('username', username.trim()) // Case-insensitive lookup
        .single();

    if (userError || !user) {
        recordFailedAttempt(rateLimitKey);
        return { error: 'Invalid username or password' };
    }

    // 2. Verify password (supports both hashed and legacy plaintext)
    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
        recordFailedAttempt(rateLimitKey);
        return { error: 'Invalid username or password' };
    }

    // 3. Auto-migrate plaintext passwords to hashed
    if (await needsHashMigration(user.password)) {
        const hashedPassword = await hashPassword(password);
        await supabase
            .from('allowed_users')
            .update({ password: hashedPassword })
            .eq('username', user.username);
    }

    // 4. Clear rate limit on success
    clearAttempts(rateLimitKey);

    // 5. Create session
    const isFirstLogin = user.is_first_login ?? user.must_change_password ?? true;
    const hasOnboarded = user.has_onboarded ?? false;

    // Generate new Session Token for Single Session Enforcement
    const sessionToken = crypto.randomUUID();

    // Save token to DB (invalidates other sessions)
    // Note: This may fail silently if migration hasn't been applied yet
    try {
        await supabase.from('allowed_users').update({ session_token: sessionToken }).eq('username', user.username);
    } catch (err) {
        console.warn('[Login] Could not update session_token:', err);
    }

    await createSession({
        username: user.username,
        name: user.full_name,
        group: user.original_group || '',
        section: user.original_section || '',
        role: user.access_role,
        isFirstLogin: isFirstLogin,
        hasOnboarded: hasOnboarded,
        loggedInAt: new Date().toISOString(),
        sessionToken: sessionToken
    });

    // 6. Check if first login - redirect to change password
    if (isFirstLogin) {
        redirect('/change-password');
    }

    // 7. Check if needs onboarding - redirect to onboarding
    if (!hasOnboarded && user.access_role !== 'admin') {
        redirect('/onboarding');
    }

    revalidatePath('/', 'layout');
    redirect('/');
}

export async function signout() {
    await destroySession();
    revalidatePath('/', 'layout');
    redirect('/login');
}

export async function getSession() {
    return getSecureSession();
}

interface ChangePasswordState {
    error?: string;
}

export async function changePassword(_prevState: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
    const supabase = await createClient();
    const session = await getSecureSession();

    if (!session) {
        redirect('/login');
    }

    const newPassword = formData.get('new_password') as string;
    const confirmPassword = formData.get('confirm_password') as string;

    if (!newPassword || !confirmPassword) {
        return { error: 'Please fill in all fields' };
    }

    if (newPassword !== confirmPassword) {
        return { error: 'Passwords do not match' };
    }

    if (newPassword.length < 8) {
        return { error: 'Password must be at least 8 characters' };
    }

    // Check password strength
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasUppercase || !hasLowercase || !hasNumber) {
        return { error: 'Password must contain uppercase, lowercase, and a number' };
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password in database
    const { error: updateError } = await supabase
        .from('allowed_users')
        .update({
            password: hashedPassword,
            is_first_login: false,
            must_change_password: false
        })
        .eq('username', session.username);

    if (updateError) {
        console.error('Password update error:', updateError);
        return { error: 'Failed to update password. Please try again.' };
    }

    // Update session
    await updateSession({ isFirstLogin: false });

    revalidatePath('/', 'layout');
    redirect('/');
}
