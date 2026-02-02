import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'sciencehub_session';

interface SessionPayload {
    username: string;
    role: string;
    isFirstLogin: boolean;
    hasOnboarded?: boolean;
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes that don't need auth
    const publicRoutes = ['/login', '/api'];
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    if (isPublicRoute) {
        return NextResponse.next();
    }

    // Check for session cookie
    const sessionCookie = request.cookies.get(SESSION_COOKIE);

    if (!sessionCookie) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    try {
        // Parse session data
        const session = JSON.parse(sessionCookie.value) as SessionPayload;

        // --- ENHANCED SECURITY CHECK ---
        // Verify user status against DB to catch resets/bans immediately
        // We use a fresh client for middleware to avoid cookie caching issues
        try {
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const { data: user } = await supabase
                .from('allowed_users')
                .select('is_first_login, access_role')
                .eq('username', session.username)
                .single();

            // 1. If user deleted or reset (is_first_login became true while session says false)
            if (!user || (user.is_first_login && !session.isFirstLogin)) {
                const response = NextResponse.redirect(new URL('/login', request.url));
                response.cookies.delete(SESSION_COOKIE);
                return response;
            }

            // 2. Refresh Role if changed (e.g. Leader demotion)
            if (user && user.access_role !== session.role) {
                session.role = user.access_role;
                // Note: We don't update the cookie here to keep middleware simple, 
                // but we use the NEW role for the checks below.
            }

            // Sync isFirstLogin from DB for logic below
            if (user) {
                session.isFirstLogin = user.is_first_login;
            }

        } catch (err) {
            console.error('Middleware DB Check Failed:', err);
            // Fail open or closed? 
            // If DB is down, maybe fail closed for security, or open for usability?
            // For now, proceed with cookie data, but log error. 
            // Or better: if we can't verify, we trust cookie for now to avoid downtime.
        }
        // -------------------------------

        // If first login and not on change-password page, redirect there
        if (session.isFirstLogin && !pathname.startsWith('/change-password')) {
            const changePasswordUrl = new URL('/change-password', request.url);
            return NextResponse.redirect(changePasswordUrl);
        }

        // If not first login but on change-password page, redirect to home
        if (!session.isFirstLogin && pathname.startsWith('/change-password')) {
            const homeUrl = new URL('/', request.url);
            return NextResponse.redirect(homeUrl);
        }

        // Onboarding check: if user hasn't completed onboarding and is not on /onboarding, redirect there
        // Skip for admin users since they may not need onboarding
        if (!session.isFirstLogin && session.hasOnboarded === false && session.role !== 'admin') {
            if (!pathname.startsWith('/onboarding')) {
                const onboardingUrl = new URL('/onboarding', request.url);
                return NextResponse.redirect(onboardingUrl);
            }
        }

        // If already onboarded but on /onboarding page, redirect to home
        if (session.hasOnboarded === true && pathname.startsWith('/onboarding')) {
            const homeUrl = new URL('/', request.url);
            return NextResponse.redirect(homeUrl);
        }

        // Admin/Leader Route Protection
        if ((pathname.startsWith('/admin') || pathname.startsWith('/leader')) && !['admin', 'leader'].includes(session.role)) {
            const homeUrl = new URL('/', request.url);
            return NextResponse.redirect(homeUrl);
        }

    } catch {
        // Invalid session, redirect to login
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete(SESSION_COOKIE);
        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
