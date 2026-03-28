import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/server';

import {
    createSession,
    verifyPassword,
    hashPassword
} from '@/lib/auth/session';
import { checkLoginRateLimit, recordLoginFailure, clearLoginRateLimit } from '@/lib/auth/rate-limit-redis';


// Parse device info from user agent string
function parseDeviceInfo(userAgent: string) {
    const ua = userAgent.toLowerCase();
    let browser = 'Unknown';
    if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('edg/')) browser = 'Edge';
    else if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('opera') || ua.includes('opr/')) browser = 'Opera';

    let os = 'Unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac os')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

    const isMobile = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    let device = `${browser} on ${os}`;
    if (isMobile) device = `📱 ${device}`;
    else device = `💻 ${device}`;

    return { browser, os, device, isMobile };
}

export async function POST(request: Request) {
    try {
        const contentType = request.headers.get('content-type') || '';
        let username: string | null = null;
        let password: string | null = null;

        if (contentType.includes('application/json')) {
            const body = await request.json();
            username = body.username;
            password = body.password;
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await request.formData();
            username = formData.get('username') as string;
            password = formData.get('password') as string;
        } else {
            return NextResponse.json(
                { error: 'Unsupported content type' },
                { status: 400 }
            );
        }

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        const supabase = await createServiceRoleClient();
        const headersList = await headers();
        const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
        const userAgent = headersList.get('user-agent') || 'unknown';
        const rateLimitKey = `${ip}:${username.trim().toLowerCase()}`;

        // Check rate limit
        const rateLimit = await checkLoginRateLimit(rateLimitKey);
        if (rateLimit.limited) {

            return NextResponse.json(
                { error: `Too many attempts. Try again in ${Math.ceil(rateLimit.resetInSeconds / 60)} minutes.` },
                { status: 429 }
            );
        }

        // Check credentials
        const { data: user, error: userError } = await supabase
            .from('allowed_users')
            .select('*')
            .ilike('username', username.trim())
            .single();

        if (userError || !user) {
            await recordLoginFailure(rateLimitKey);

            return NextResponse.json(
                { error: 'Invalid username or password' },
                { status: 401 }
            );
        }

        // Verify password
        const verification = await verifyPassword(password, user.password);
        if (!verification.valid) {
            await recordLoginFailure(rateLimitKey);

            return NextResponse.json(
                { error: 'Invalid username or password' },
                { status: 401 }
            );
        }

        // Auto-migrate plaintext password to bcrypt
        if (verification.needsHash) {
            try {
                const hashed = await hashPassword(password);
                await supabase
                    .from('allowed_users')
                    .update({ password: hashed })
                    .eq('username', user.username);
            } catch (e) {
                console.error('[AUTH API] Failed to auto-migrate password:', e);
            }
        }

        // Clear rate limit on success
        await clearLoginRateLimit(rateLimitKey);

        // Create session
        const isFirstLogin = user.is_first_login ?? user.must_change_password ?? true;
        const hasOnboarded = user.has_onboarded ?? false;
        const sessionToken = crypto.randomUUID();
        const deviceInfo = parseDeviceInfo(userAgent);

        // Save session token to DB
        try {
            await supabase.from('allowed_users').update({
                session_token: sessionToken,
                device_info: deviceInfo,
                last_login_at: new Date().toISOString(),
                last_login_ip: ip
            }).eq('username', user.username);

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
                // Silently fail if table doesn't exist
            }
        } catch (err) {
            console.warn('[Login API] Could not update session info:', err);
        }



        // Create signed session cookie
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

        // Determine redirect target
        let redirectTo = '/';
        if (isFirstLogin) {
            redirectTo = '/change-password';
        } else if (!hasOnboarded && !['admin', 'super_admin', 'doctor'].includes(user.access_role)) {
            redirectTo = '/onboarding';
        }

        return NextResponse.json({
            success: true,
            redirectTo,
            user: {
                username: user.username,
                name: user.full_name,
                role: user.access_role,
                group: user.original_group || '',
                section: user.original_section || '',
            }
        }, { status: 200 });

    } catch (error) {
        console.error('[Login API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
