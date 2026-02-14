'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/safety/logger';
import {
    createSession,
    getSession as getSecureSession,
    destroySession,
    updateSession,
    verifyPassword,
    hashPassword
} from '@/lib/auth/session';
import { checkLoginRateLimit, recordLoginFailure, clearLoginRateLimit } from '@/lib/auth/rate-limit-redis';
import { logSecurityEvent } from '@/lib/auth/security-monitor';

interface LoginState {
    error?: string;
}

// Parse device info from user agent string
function parseDeviceInfo(userAgent: string): {
    browser: string;
    os: string;
    device: string;
    isMobile: boolean;
} {
    const ua = userAgent.toLowerCase();

    // Detect browser
    let browser = 'Unknown';
    if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('edg/')) browser = 'Edge';
    else if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('opera') || ua.includes('opr/')) browser = 'Opera';

    // Detect OS
    let os = 'Unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac os')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

    // Detect if mobile
    const isMobile = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);

    // Friendly device name
    let device = `${browser} on ${os}`;
    if (isMobile) device = `📱 ${device}`;
    else device = `💻 ${device}`;

    return { browser, os, device, isMobile };
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
    const userAgent = headersList.get('user-agent') || 'unknown';
    const rateLimitKey = `${ip}:${username.trim().toLowerCase()}`;

    // Check rate limit (Redis-backed in production)
    const rateLimit = await checkLoginRateLimit(rateLimitKey);
    if (rateLimit.limited) {
        await logSecurityEvent({
            type: 'RATE_LIMIT_EXCEEDED',
            username: username.trim(),
            ip,
            userAgent,
            details: `Blocked after exceeding login attempts. Reset in ${rateLimit.resetInSeconds}s`
        });
        return { error: `Too many attempts. Try again in ${Math.ceil(rateLimit.resetInSeconds / 60)} minutes.` };
    }

    // 1. Check credentials against allowed_users table
    const { data: user, error: userError } = await supabase
        .from('allowed_users')
        .select('*')
        .ilike('username', username.trim()) // Case-insensitive lookup
        .single();

    if (userError || !user) {
        await recordLoginFailure(rateLimitKey);
        await logSecurityEvent({
            type: 'LOGIN_FAILED',
            username: username.trim(),
            ip,
            userAgent,
            details: 'User not found'
        });
        return { error: 'Invalid username or password' };
    }

    // 2. Verify password (bcrypt hashed only - plaintext support removed)
    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
        await recordLoginFailure(rateLimitKey);
        await logSecurityEvent({
            type: 'LOGIN_FAILED',
            username: user.username,
            ip,
            userAgent,
            details: 'Invalid password'
        });
        return { error: 'Invalid username or password' };
    }

    // 3. Clear rate limit on success
    await clearLoginRateLimit(rateLimitKey);

    // 4. Create session
    const isFirstLogin = user.is_first_login ?? user.must_change_password ?? true;
    const hasOnboarded = user.has_onboarded ?? false;

    // Generate new Session Token for Single Session Enforcement
    const sessionToken = crypto.randomUUID();

    // Parse device info from user agent
    const deviceInfo = parseDeviceInfo(userAgent);

    // Save token + device info to DB (invalidates other sessions)
    try {
        await supabase.from('allowed_users').update({
            session_token: sessionToken,
            device_info: deviceInfo,
            last_login_at: new Date().toISOString(),
            last_login_ip: ip
        }).eq('username', user.username);

        // Record in session history (for audit trail)
        try {
            await supabase.from('session_history').insert({
                username: user.username,
                session_token: sessionToken,
                device_info: deviceInfo,
                ip_address: ip,
                user_agent: userAgent,
                is_active: true
            });
        } catch {
            // Silently fail if table doesn't exist yet
        }
    } catch (err) {
        console.warn('[Login] Could not update session info:', err);
    }

    // Log successful login
    await logActivity({
        action: 'LOGIN',
        username: user.username,
        userId: user.id || undefined, // allowed_users might not have UUID in strict type, but usually does in Supabase
        details: {
            role: user.access_role,
            device: deviceInfo.device,
            ip: ip
        }
    });

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

    // 5. Check if first login - redirect to change password
    if (isFirstLogin) {
        redirect('/change-password');
    }

    // 6. Check if needs onboarding - redirect to onboarding
    if (!hasOnboarded && !['admin', 'super_admin'].includes(user.access_role)) {
        redirect('/onboarding');
    }

    revalidatePath('/', 'layout');
    redirect('/');
}

export async function signout() {
    // Get session before destroying it to log who is logging out
    const session = await getSecureSession();
    if (session) {
        await logActivity({
            action: 'LOGOUT',
            username: session.username,
            details: {
                role: session.role
            }
        });
    }

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

    // Silent tracking
    logActivity({
        action: 'PASSWORD_CHANGE',
        username: session.username,
        details: { role: session.role }
    });

    revalidatePath('/', 'layout');
    redirect('/');
}
