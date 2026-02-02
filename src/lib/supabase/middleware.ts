import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    // Create client with cookie management
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
                    cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
                        request.cookies.set(name, value)
                    )

                    supabaseResponse = NextResponse.next({
                        request,
                    })

                    cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: Record<string, unknown> }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Use getUser to verify session securely
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname;

    // 1. If user is NOT logged in and tries to access protected pages
    // Protected pages: Everything EXCEPT /login and /auth/* callbacks
    if (
        !user &&
        !path.startsWith('/login') &&
        !path.startsWith('/auth')
    ) {
        // Redirect to Login
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // 2. If user IS logged in and tries to access /login
    if (user && path.startsWith('/login')) {
        // Redirect to Home
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
