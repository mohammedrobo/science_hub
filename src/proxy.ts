import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SESSION_COOKIE = 'sciencehub_session';

interface SessionPayload {
    username: string;
    role: string;
    isFirstLogin: boolean;
    hasOnboarded?: boolean;
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes that don't need auth
    const publicRoutes = ['/login', '/api'];
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    // Static files that should always be accessible (PWA, icons, etc.)
    const isStaticFile = pathname.match(/\.(json|js|png|ico|svg|webp|jpg|jpeg|gif|woff2?|css|txt|xml)$/i);

    if (isPublicRoute || isStaticFile) {
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

        // --- LIGHTWEIGHT SESSION CHECK ---
        // Only verify against DB occasionally to avoid slow requests
        // The session cookie is signed/trusted, DB check is extra security
        const lastVerified = request.cookies.get('sciencehub_verified')?.value;
        const now = Date.now();
        const VERIFY_INTERVAL = 5 * 60 * 1000; // Only verify every 5 minutes
        
        const shouldVerifyDb = !lastVerified || (now - parseInt(lastVerified)) > VERIFY_INTERVAL;
        
        if (shouldVerifyDb) {
            try {
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
                    response.cookies.delete('sciencehub_verified');
                    return response;
                }

                // 2. Refresh Role if changed (e.g. Leader demotion)
                if (user && user.access_role !== session.role) {
                    session.role = user.access_role;
                }

                // Sync isFirstLogin from DB for logic below
                if (user) {
                    session.isFirstLogin = user.is_first_login;
                }

                // Mark as verified - will set cookie below
            } catch (err) {
                console.error('Proxy DB Check Failed:', err);
                // If DB is down, trust the cookie for usability
            }
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

    // Set verification timestamp cookie if we did a DB check
    const response = NextResponse.next();
    const lastVerified = request.cookies.get('sciencehub_verified')?.value;
    const now = Date.now();
    const VERIFY_INTERVAL = 5 * 60 * 1000;
    
    if (!lastVerified || (now - parseInt(lastVerified)) > VERIFY_INTERVAL) {
        response.cookies.set('sciencehub_verified', now.toString(), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60, // 1 hour
        });
    }
    
    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, manifest.json, sw.js, robots.txt (metadata/PWA files)
         * - Static file extensions (images, fonts, etc.)
         */
        '/((?!api|_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|js|json|css|txt|xml)$).*)',
    ],
};
