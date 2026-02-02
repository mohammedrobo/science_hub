'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const SESSION_COOKIE = 'sciencehub_session'; // FIXED: Match login action cookie name

interface ChangePasswordState {
    error?: string;
    success?: boolean;
}

export async function changePassword(
    _prevState: ChangePasswordState,
    formData: FormData
): Promise<ChangePasswordState> {
    // 1. Get Session - Retrieve the sciencehub_session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);

    if (!sessionCookie || !sessionCookie.value) {
        return { error: 'Session expired. Please login again.' };
    }

    // Parse the session to get the username
    let sessionUsername: string;
    try {
        const session = JSON.parse(sessionCookie.value);
        sessionUsername = session.username;

        if (!sessionUsername) {
            return { error: 'Invalid session. Please login again.' };
        }
    } catch {
        return { error: 'Session corrupted. Please login again.' };
    }

    // Get form data - FIXED: Match form field names from page.tsx
    const password = formData.get('new_password') as string;
    const confirmPassword = formData.get('confirm_password') as string;

    // 2. Validation - Check passwords match and length
    if (!password || !confirmPassword) {
        return { error: 'Please fill in all fields.' };
    }

    if (password !== confirmPassword) {
        return { error: 'Passwords do not match.' };
    }

    if (password.length < 6) {
        return { error: 'Password must be at least 6 characters.' };
    }

    // 3. Direct Database Update
    const supabase = await createClient();

    const { error: updateError } = await supabase
        .from('allowed_users')
        .update({
            password: password,
            is_first_login: false
        })
        .eq('username', sessionUsername);

    // 4. Error Handling
    if (updateError) {
        console.error('Database update error:', updateError);
        return { error: `Failed to update password: ${updateError.message}` };
    }

    // Update session cookie to reflect password changed
    try {
        const session = JSON.parse(sessionCookie.value);
        const updatedSession = {
            ...session,
            isFirstLogin: false
        };

        cookieStore.set(SESSION_COOKIE, JSON.stringify(updatedSession), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/'
        });
    } catch {
        // Session update failed but password was changed, continue
    }

    // 5. Redirect to home (not dashboard since that route may not exist)
    // 5. Redirect to Onboarding
    redirect('/onboarding');
}
