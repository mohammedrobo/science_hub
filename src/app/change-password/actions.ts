'use server';

import { redirect } from 'next/navigation';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getSession, updateSession, hashPassword } from '@/lib/auth/session';

interface ChangePasswordState {
    error?: string;
    success?: boolean;
}

export async function changePassword(
    _prevState: ChangePasswordState,
    formData: FormData
): Promise<ChangePasswordState> {
    // 1. Get session using proper JWT-verified session reader
    const session = await getSession();

    if (!session || !session.username) {
        return { error: 'Session expired. Please login again.' };
    }

    const sessionUsername = session.username;

    // Get form data
    const password = formData.get('new_password') as string;
    const confirmPassword = formData.get('confirm_password') as string;

    // 2. Validation
    if (!password || !confirmPassword) {
        return { error: 'Please fill in all fields.' };
    }

    if (password !== confirmPassword) {
        return { error: 'Passwords do not match.' };
    }

    if (password.length < 8) {
        return { error: 'Password must be at least 8 characters.' };
    }

    // Require complexity: uppercase, lowercase, and number
    if (!/[A-Z]/.test(password)) {
        return { error: 'Password must contain at least one uppercase letter.' };
    }
    if (!/[a-z]/.test(password)) {
        return { error: 'Password must contain at least one lowercase letter.' };
    }
    if (!/[0-9]/.test(password)) {
        return { error: 'Password must contain at least one number.' };
    }

    // 3. Hash and update in DB (service role bypasses RLS)
    const supabase = await createServiceRoleClient();
    const hashedPassword = await hashPassword(password);

    const { error: updateError } = await supabase
        .from('allowed_users')
        .update({
            password: hashedPassword,
            is_first_login: false
        })
        .eq('username', sessionUsername);

    if (updateError) {
        console.error('[ChangePassword] DB error:', updateError);
        return { error: 'Failed to update password. Please try again.' };
    }

    // 4. Update session cookie properly (re-signs as JWT)
    await updateSession({ isFirstLogin: false });

    // 5. Redirect to onboarding
    redirect('/onboarding');
}
