import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE = 'sciencehub_session';
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET environment variable is required in production');
}
const SESSION_SECRET = new TextEncoder().encode(
    process.env.SESSION_SECRET || 'dev-only-secret-do-not-use-in-production-32!'
);

interface SessionPayload {
    username: string;
    role: string;
    isFirstLogin: boolean;
    hasOnboarded?: boolean;
}

/**
 * Decode and verify the session cookie.
 * Supports new JWT format and legacy unsigned JSON (during migration).
 */
async function decodeSession(cookieValue: string): Promise<SessionPayload | null> {
    // Only accept signed JWT sessions — unsigned cookies are rejected
    try {
        const { payload } = await jwtVerify(cookieValue, SESSION_SECRET);
        return payload as unknown as SessionPayload;
    } catch {
        return null;
    }
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes that don't need auth
    const publicRoutes = ['/login'];
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    // Public API routes (no auth needed)
    const publicApiRoutes = ['/api/courses', '/api/auth/check-session', '/api/auth/login', '/api/cron', '/api/n8n'];
    const isPublicApi = publicApiRoutes.some(route => pathname.startsWith(route));

    // Static files that should always be accessible (PWA, icons, etc.)
    const isStaticFile = pathname.match(/\.(json|js|png|ico|svg|webp|jpg|jpeg|gif|woff2?|css|txt|xml)$/i);

    if (isPublicRoute || isPublicApi || isStaticFile) {
        return NextResponse.next();
    }

    // Check for session cookie
    const sessionCookie = request.cookies.get(SESSION_COOKIE);

    if (!sessionCookie) {
        // API routes should return 401 JSON, not redirect
        if (pathname.startsWith('/api/')) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    try {
        // Verify and decode session (JWT signature checked)
        const session = await decodeSession(sessionCookie.value);

        if (!session) {
            // Invalid/tampered cookie — clear it and redirect
            if (pathname.startsWith('/api/')) {
                const response = NextResponse.json(
                    { error: 'Invalid session' },
                    { status: 401 }
                );
                response.cookies.delete(SESSION_COOKIE);
                return response;
            }
            const response = NextResponse.redirect(new URL('/login', request.url));
            response.cookies.delete(SESSION_COOKIE);
            return response;
        }

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
        // Skip for super_admin/admin users since they may not need onboarding
        if (!session.isFirstLogin && session.hasOnboarded === false && !['super_admin', 'admin', 'doctor'].includes(session.role)) {
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

        // Admin Route Protection — only super_admin and admin
        if (pathname.startsWith('/admin') && !['super_admin', 'admin'].includes(session.role)) {
            const homeUrl = new URL('/', request.url);
            return NextResponse.redirect(homeUrl);
        }

        // Leader Route Protection — admin, super_admin, and leader
        if ((pathname === '/leader' || pathname.startsWith('/leader/')) && !['super_admin', 'admin', 'leader'].includes(session.role)) {
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
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Refresh the session cookie - extend by 7 days on every request
    response.cookies.set(SESSION_COOKIE, sessionCookie.value, {
        httpOnly: true,
        secure: isProduction,
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
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, manifest.json, sw.js, robots.txt (metadata/PWA files)
         * - Static file extensions (images, fonts, etc.)
         * Note: API routes ARE included so proxy can enforce auth on protected APIs
         */
        '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|css|txt|xml)$).*)',
    ],
};
