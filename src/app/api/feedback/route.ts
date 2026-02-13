import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

// Rate limit: 5 submissions per hour per user
const feedbackLimiter = rateLimit({
    interval: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
});

// POST - Submit feedback
export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const supabase = await createServiceRoleClient();

        // Rate limiting
        const rateLimitKey = `feedback_${session.username}`;
        const { success, remaining } = await feedbackLimiter.check(rateLimitKey);

        if (!success) {
            return NextResponse.json(
                { error: 'Too many submissions. Please wait before submitting again.' },
                {
                    status: 429,
                    headers: { 'X-RateLimit-Remaining': remaining.toString() }
                }
            );
        }

        const body = await request.json();
        const { type, title, description, pageUrl, screenshot } = body;

        // Validate required fields
        if (!type || !title || !description) {
            return NextResponse.json(
                { error: 'Type, title, and description are required' },
                { status: 400 }
            );
        }

        // Validate type
        const validTypes = ['bug', 'idea', 'question', 'other'];
        if (!validTypes.includes(type)) {
            return NextResponse.json(
                { error: 'Invalid feedback type' },
                { status: 400 }
            );
        }

        // Validate lengths (prevent spam)
        if (title.length > 200) {
            return NextResponse.json(
                { error: 'Title must be less than 200 characters' },
                { status: 400 }
            );
        }

        if (description.length > 5000) {
            return NextResponse.json(
                { error: 'Description must be less than 5000 characters' },
                { status: 400 }
            );
        }

        // Sanitize inputs (basic XSS prevention)
        const sanitize = (str: string) => str
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .trim();

        // Get user agent from headers
        const userAgent = request.headers.get('user-agent') || 'Unknown';

        // Insert feedback
        const { data, error } = await supabase
            .from('feedback')
            .insert({
                username: session.username,
                section: session.section,
                type: type,
                title: sanitize(title),
                description: sanitize(description),
                page_url: pageUrl ? sanitize(pageUrl).substring(0, 500) : null,
                user_agent: userAgent.substring(0, 500),
                screenshot_url: screenshot || null,
                status: 'new'
            })
            .select('id')
            .single();

        if (error) {
            console.error('[Feedback] Insert error:', error);
            return NextResponse.json(
                { error: 'Failed to submit feedback' },
                { status: 500 }
            );
        }

        console.log(`[Feedback] New ${type} from ${session.username}: ${title}`);

        return NextResponse.json({
            success: true,
            id: data.id,
            message: 'Thank you for your feedback!'
        });
    } catch (error) {
        console.error('[Feedback] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET - Get user's own feedback (or all for admins)
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const isAdmin = session.role === 'admin';
        const supabase = await createServiceRoleClient();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const type = searchParams.get('type');

        let query = supabase
            .from('feedback')
            .select('*')
            .order('created_at', { ascending: false });

        // Non-admins can only see their own feedback
        if (!isAdmin) {
            query = query.eq('username', session.username);
        }

        // Optional filters
        if (status) {
            query = query.eq('status', status);
        }
        if (type) {
            query = query.eq('type', type);
        }

        // Limit results
        query = query.limit(50);

        const { data, error } = await query;

        if (error) {
            console.error('[Feedback] Query error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch feedback' },
                { status: 500 }
            );
        }

        return NextResponse.json({ feedback: data });
    } catch (error) {
        console.error('[Feedback] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
