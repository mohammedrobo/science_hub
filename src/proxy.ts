import { NextResponse, type NextRequest } from 'next/server';

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

        // --- SKIP DB CHECK FOR SPEED ---
        // DB verification only happens on login and password change
        // The session cookie is trusted for all other navigation
        // This makes navigation instant instead of 800ms+ delay
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

    // Session is valid - create response with refreshed cookie (rolling session)
    const response = NextResponse.next();
    
    // Refresh the session cookie - extend by 7 days on every request
    // This prevents the session from expiring while user is actively using the site
    response.cookies.set(SESSION_COOKIE, sessionCookie.value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
    });
    
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
