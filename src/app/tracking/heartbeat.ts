'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getSession } from '@/app/login/actions';
import { headers } from 'next/headers';

// Parse device from UA
function parseDevice(ua: string): string {
    if (/mobile/i.test(ua)) return 'Mobile';
    if (/tablet|ipad/i.test(ua)) return 'Tablet';
    return 'Desktop';
}

/**
 * Start a new active session — called once when the page first loads.
 * Returns a sessionId for subsequent heartbeats.
 */
export async function startActiveSession(sessionId: string, currentPage: string) {
    const session = await getSession();
    if (!session) return { error: 'Not authenticated' };

    const supabase = await createServiceRoleClient();
    const headersList = await headers();
    const ua = headersList.get('user-agent') || '';

    // Close any stale sessions for this user first
    const { error: rpcError } = await supabase.rpc('close_stale_sessions');
    if (rpcError) {
        // RPC might not exist if migration hasn't run — fall back to manual cleanup
        await supabase
            .from('active_sessions')
            .update({
                is_active: false,
                ended_at: new Date(Date.now() - 120000).toISOString(),
            })
            .eq('username', session.username)
            .eq('is_active', true)
            .lt('last_heartbeat', new Date(Date.now() - 120000).toISOString());
    }

    const { error } = await supabase.from('active_sessions').insert({
        username: session.username,
        session_id: sessionId,
        current_page: currentPage,
        pages_visited: [currentPage],
        device_info: {
            device: parseDevice(ua),
            userAgent: ua.substring(0, 200), // truncate
        },
        started_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
        is_active: true,
    });

    if (error) {
        // Table might not exist yet (42P01 = PG, PGRST205 = PostgREST)
        if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('does not exist')) {
            return { error: 'table_not_ready' };
        }
        console.error('[Heartbeat] Start session error:', error);
        return { error: 'Failed to start session' };
    }

    return { success: true };
}

/**
 * Heartbeat — called every 30 seconds while the user is active.
 * Updates the last_heartbeat timestamp and current page.
 */
export async function heartbeat(sessionId: string, currentPage: string) {
    const session = await getSession();
    if (!session) return { error: 'Not authenticated' };

    const supabase = await createServiceRoleClient();

    // Update last heartbeat + current page
    const { error } = await supabase
        .from('active_sessions')
        .update({
            last_heartbeat: new Date().toISOString(),
            current_page: currentPage,
        })
        .eq('session_id', sessionId)
        .eq('username', session.username)
        .eq('is_active', true);

    if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('does not exist')) {
            return { error: 'table_not_ready' };
        }
        return { error: 'Failed' };
    }

    // Add page to visited list (append if not present)
    const { error: rpcErr } = await supabase.rpc('append_page_to_session', {
        p_session_id: sessionId,
        p_page: currentPage,
    });

    if (rpcErr) {
        // Fallback: RPC not available, manually append
        const { data } = await supabase
            .from('active_sessions')
            .select('pages_visited')
            .eq('session_id', sessionId)
            .single();

        if (data) {
            const pages: string[] = data.pages_visited || [];
            if (!pages.includes(currentPage)) {
                pages.push(currentPage);
                await supabase
                    .from('active_sessions')
                    .update({ pages_visited: pages })
                    .eq('session_id', sessionId);
            }
        }
    }

    return { success: true };
}

/**
 * End session — called when the user closes the tab or navigates away.
 */
export async function endActiveSession(sessionId: string) {
    const session = await getSession();
    if (!session) return;

    const supabase = await createServiceRoleClient();

    // Get the session to compute duration
    const { data: activeSession } = await supabase
        .from('active_sessions')
        .select('started_at')
        .eq('session_id', sessionId)
        .eq('username', session.username)
        .single();

    const duration = activeSession
        ? Math.floor((Date.now() - new Date(activeSession.started_at).getTime()) / 1000)
        : 0;

    await supabase
        .from('active_sessions')
        .update({
            is_active: false,
            ended_at: new Date().toISOString(),
            duration_seconds: duration,
        })
        .eq('session_id', sessionId)
        .eq('username', session.username);
}

/**
 * Get currently active sessions — for the safety dashboard "live" view.
 */
export async function getActiveSessions() {
    const session = await getSession();
    if (!session || session.role !== 'super_admin') {
        return [];
    }

    const supabase = await createServiceRoleClient();

    // First close stale sessions
    await supabase
        .from('active_sessions')
        .update({
            is_active: false,
            ended_at: new Date(Date.now() - 120000).toISOString(),
        })
        .eq('is_active', true)
        .lt('last_heartbeat', new Date(Date.now() - 120000).toISOString());

    // Get active sessions with user info
    const { data } = await supabase
        .from('active_sessions')
        .select('session_id, username, started_at, last_heartbeat, current_page, device_info')
        .eq('is_active', true)
        .order('last_heartbeat', { ascending: false });

    if (!data) return [];

    // Get user names
    const usernames = [...new Set(data.map(s => s.username))];
    const { data: users } = await supabase
        .from('allowed_users')
        .select('username, full_name, original_section, original_group')
        .in('username', usernames);

    const userMap = new Map((users || []).map(u => [u.username, u]));

    return data.map(s => ({
        ...s,
        full_name: userMap.get(s.username)?.full_name || s.username,
        section: userMap.get(s.username)?.original_section || '',
        group: userMap.get(s.username)?.original_group || '',
        active_minutes: Math.floor((Date.now() - new Date(s.started_at).getTime()) / 60000),
    }));
}

/**
 * Get time spent stats for a specific student.
 */
export async function getStudentTimeStats(username: string) {
    const session = await getSession();
    if (!session || session.role !== 'super_admin') {
        return null;
    }

    const supabase = await createServiceRoleClient();

    // Get all sessions for this student in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: sessions } = await supabase
        .from('active_sessions')
        .select('started_at, ended_at, last_heartbeat, duration_seconds, pages_visited, current_page, device_info, is_active')
        .eq('username', username)
        .gte('started_at', thirtyDaysAgo.toISOString())
        .order('started_at', { ascending: false });

    if (!sessions || sessions.length === 0) {
        return {
            totalMinutesToday: 0,
            totalMinutesWeek: 0,
            totalMinutesMonth: 0,
            avgMinutesPerDay: 0,
            sessionCount: 0,
            longestSession: 0,
            dailyMinutes: [] as { date: string; minutes: number }[],
            recentSessions: [],
        };
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    let totalSecondsToday = 0;
    let totalSecondsWeek = 0;
    let totalSecondsMonth = 0;
    let longestSession = 0;
    const dailyMap = new Map<string, number>();

    for (const s of sessions) {
        const dur = s.duration_seconds || Math.floor((new Date(s.last_heartbeat).getTime() - new Date(s.started_at).getTime()) / 1000);
        const day = s.started_at.split('T')[0];

        totalSecondsMonth += dur;
        dailyMap.set(day, (dailyMap.get(day) || 0) + dur);

        if (day === todayStr) totalSecondsToday += dur;
        if (new Date(s.started_at) >= weekAgo) totalSecondsWeek += dur;
        if (dur > longestSession) longestSession = dur;
    }

    // Build daily minutes array for chart
    const dailyMinutes: { date: string; minutes: number }[] = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        dailyMinutes.push({
            date: dateStr,
            minutes: Math.round((dailyMap.get(dateStr) || 0) / 60),
        });
    }

    const daysWithActivity = dailyMap.size;

    return {
        totalMinutesToday: Math.round(totalSecondsToday / 60),
        totalMinutesWeek: Math.round(totalSecondsWeek / 60),
        totalMinutesMonth: Math.round(totalSecondsMonth / 60),
        avgMinutesPerDay: daysWithActivity > 0 ? Math.round(totalSecondsMonth / 60 / daysWithActivity) : 0,
        sessionCount: sessions.length,
        longestSession: Math.round(longestSession / 60),
        dailyMinutes,
        recentSessions: sessions.slice(0, 10).map(s => ({
            startedAt: s.started_at,
            endedAt: s.ended_at || s.last_heartbeat,
            durationMinutes: Math.round((s.duration_seconds || Math.floor((new Date(s.last_heartbeat).getTime() - new Date(s.started_at).getTime()) / 1000)) / 60),
            pagesVisited: (s.pages_visited || []).length,
            currentPage: s.current_page,
            device: s.device_info?.device || 'Unknown',
            isActive: s.is_active,
        })),
    };
}
