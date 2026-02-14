import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/tracking/end
 * 
 * Called via navigator.sendBeacon() when the user closes the tab.
 * sendBeacon can't call server actions, so we need a plain REST endpoint.
 * 
 * Body: { sessionId: string, username: string }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { sessionId, username } = body;

        if (!sessionId || !username) {
            return NextResponse.json({ error: 'Missing sessionId or username' }, { status: 400 });
        }

        const supabase = await createServiceRoleClient();

        // Get the session to compute duration
        const { data: activeSession } = await supabase
            .from('active_sessions')
            .select('started_at')
            .eq('session_id', sessionId)
            .eq('username', username)
            .eq('is_active', true)
            .single();

        if (!activeSession) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        const duration = Math.floor(
            (Date.now() - new Date(activeSession.started_at).getTime()) / 1000
        );

        await supabase
            .from('active_sessions')
            .update({
                is_active: false,
                ended_at: new Date().toISOString(),
                duration_seconds: duration,
            })
            .eq('session_id', sessionId)
            .eq('username', username);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Tracking/End] Error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
