'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import {
    getAllStudentEngagement,
    computeEngagementScore,
    getActivityHeatmap as getHeatmap,
    getClassOverview as getOverview,
    generateSmartAlerts,
    getAvailableSectionsAndGroups,
    type EngagementScore,
    type HeatmapCell,
    type ClassOverview,
} from '@/lib/safety/analytics';

// ═══════════════════════════════════════════════════════════════
// Admin Auth Guard
// ═══════════════════════════════════════════════════════════════

async function requireAdmin() {
    const session = await getSession();
    if (!session || session.role !== 'super_admin') {
        throw new Error('Unauthorized');
    }
    return session;
}

// ═══════════════════════════════════════════════════════════════
// Dashboard Overview
// ═══════════════════════════════════════════════════════════════

export async function getDashboardData(): Promise<{
    overview: ClassOverview;
    heatmap: HeatmapCell[];
    recentAlerts: any[];
    sections: string[];
    groups: string[];
}> {
    await requireAdmin();

    // Generate any new smart alerts
    await generateSmartAlerts().catch(() => {});

    const [overview, heatmap, alertsRes, filtersRes] = await Promise.all([
        getOverview(),
        getHeatmap(),
        getAlerts(1, 5),
        getAvailableSectionsAndGroups(),
    ]);

    return {
        overview,
        heatmap,
        recentAlerts: alertsRes.alerts || [],
        sections: filtersRes.sections,
        groups: filtersRes.groups,
    };
}

// ═══════════════════════════════════════════════════════════════
// Students List with Engagement Scores
// ═══════════════════════════════════════════════════════════════

export async function getStudentsWithEngagement(filters?: {
    section?: string;
    group?: string;
    username?: string;
    sortBy?: 'score' | 'name' | 'lastActive' | 'risk';
    sortDir?: 'asc' | 'desc';
}): Promise<EngagementScore[]> {
    await requireAdmin();

    const students = await getAllStudentEngagement({
        section: filters?.section,
        group: filters?.group,
        username: filters?.username,
    });

    const sortBy = filters?.sortBy || 'score';
    const dir = filters?.sortDir === 'asc' ? 1 : -1;

    students.sort((a, b) => {
        switch (sortBy) {
            case 'score': return (b.score - a.score) * dir;
            case 'name': return (a.username.localeCompare(b.username)) * dir;
            case 'lastActive': {
                const aTime = a.lastActive ? new Date(a.lastActive).getTime() : 0;
                const bTime = b.lastActive ? new Date(b.lastActive).getTime() : 0;
                return (bTime - aTime) * dir;
            }
            case 'risk': return (b.riskScore - a.riskScore) * dir;
            default: return 0;
        }
    });

    return students;
}

// ═══════════════════════════════════════════════════════════════
// Activity Logs (enhanced with filters)
// ═══════════════════════════════════════════════════════════════

export async function getActivityLogs(
    page = 1,
    limit = 50,
    filters?: {
        search?: string;
        username?: string;
        actionType?: string;
        dateFrom?: string;
        dateTo?: string;
        section?: string;
    }
) {
    await requireAdmin();

    const supabase = await createServiceRoleClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

    if (filters?.username) {
        query = query.eq('username', filters.username);
    }
    if (filters?.actionType) {
        query = query.eq('action_type', filters.actionType);
    }
    if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59Z');
    }
    if (filters?.search) {
        const sanitized = filters.search.replace(/[%_\\,\.()]/g, '');
        if (sanitized.length > 0) {
            query = query.or(`username.ilike.%${sanitized}%,action_type.ilike.%${sanitized}%`);
        }
    }

    if (filters?.section) {
        const { data: sectionStudents } = await supabase
            .from('allowed_users')
            .select('username')
            .eq('original_section', filters.section);
        if (sectionStudents && sectionStudents.length > 0) {
            const usernames = sectionStudents.map(s => s.username);
            query = query.in('username', usernames);
        }
    }

    const { data, error, count } = await query;
    if (error) {
        console.error('Fetch logs error:', error.message || error.code || JSON.stringify(error));
        // Table might not exist yet — return empty instead of crashing
        return { logs: [], count: 0 };
    }
    return { logs: data || [], count: count || 0 };
}

// ═══════════════════════════════════════════════════════════════
// Student Reports
// ═══════════════════════════════════════════════════════════════

export async function getStudentReports(page = 1, limit = 50, status = 'all') {
    await requireAdmin();

    const supabase = await createServiceRoleClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('student_reports')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

    if (status !== 'all') {
        query = query.eq('status', status);
    }

    const { data, error, count } = await query;
    if (error) return { error: 'Failed to fetch reports' };
    return { reports: data, count };
}

export async function resolveReport(reportId: string, status: 'resolved' | 'dismissed', notes?: string) {
    await requireAdmin();

    const supabase = await createServiceRoleClient();
    const { error } = await supabase
        .from('student_reports')
        .update({
            status: status.toUpperCase(),
            admin_notes: notes,
            resolved_at: new Date().toISOString()
        })
        .eq('id', reportId);

    if (error) {
        console.error('Resolve report error:', error);
        return { error: 'Failed to update report' };
    }
    return { success: true };
}

// ═══════════════════════════════════════════════════════════════
// Safety Stats
// ═══════════════════════════════════════════════════════════════

export async function getSafetyStats() {
    await requireAdmin();

    const supabase = await createServiceRoleClient();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = thirtyDaysAgo.toISOString();

    const [reportsRes, logsRes] = await Promise.all([
        supabase.from('student_reports').select('created_at, status', { count: 'exact' }).gte('created_at', cutoff),
        supabase.from('activity_logs').select('created_at, action_type', { count: 'exact' }).gte('created_at', cutoff)
    ]);

    const reports = reportsRes.data || [];
    const logs = logsRes.data || [];

    const totalReports = reportsRes.count || 0;
    const openReports = reports.filter(r => !r.status || r.status === 'PENDING').length;

    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();

    const activityTrend = last7Days.map(date => ({
        date,
        logs: logs.filter(l => l.created_at.startsWith(date)).length,
        reports: reports.filter(r => r.created_at.startsWith(date)).length
    }));

    return {
        stats: { totalReports, openReports, totalLogs: logsRes.count || 0 },
        chartData: activityTrend
    };
}

// ═══════════════════════════════════════════════════════════════
// Student Profile (detailed)
// ═══════════════════════════════════════════════════════════════

export async function getStudentProfile(username: string) {
    await requireAdmin();

    const supabase = await createServiceRoleClient();

    const [userRes, engagementRes, heatmapRes] = await Promise.all([
        supabase
            .from('allowed_users')
            .select('id, username, full_name, access_role, original_group, original_section, created_at, last_login_at, profile_picture_url')
            .ilike('username', username)
            .single(),
        computeEngagementScore(username),
        getHeatmap(username),
    ]);

    if (userRes.error || !userRes.data) {
        return { error: 'User not found' };
    }

    const [reportsRes, activitiesRes, statsRes, progressRes, notesRes] = await Promise.all([
        supabase
            .from('student_reports')
            .select('*')
            .eq('reported_username', username)
            .order('created_at', { ascending: false })
            .limit(20),
        supabase
            .from('activity_logs')
            .select('*')
            .eq('username', username)
            .order('created_at', { ascending: false })
            .limit(100),
        supabase
            .from('user_stats')
            .select('total_xp, current_rank, quizzes_taken')
            .eq('username', username)
            .single(),
        supabase
            .from('user_progress')
            .select('content_id, completed_at, content_type')
            .eq('username', username),
        supabase
            .from('student_notes')
            .select('*')
            .eq('student_username', username)
            .order('created_at', { ascending: false }),
    ]);

    // Daily activity for chart
    const activities = activitiesRes.data || [];
    const dailyActivity: { date: string; actions: number }[] = [];
    const dayMap = new Map<string, number>();
    for (const a of activities) {
        const day = a.created_at.split('T')[0];
        dayMap.set(day, (dayMap.get(day) || 0) + 1);
    }
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        dailyActivity.push({ date: dateStr, actions: dayMap.get(dateStr) || 0 });
    }

    return {
        profile: {
            ...userRes.data,
            engagement: engagementRes,
            xp: statsRes.data?.total_xp || 0,
            rank: statsRes.data?.current_rank || 'Unranked',
            quizzesTaken: statsRes.data?.quizzes_taken || 0,
        },
        reports: reportsRes.data || [],
        recentActivity: activities,
        progress: progressRes.data || [],
        notes: notesRes.data || [],
        dailyActivity,
        heatmap: heatmapRes,
    };
}

// ═══════════════════════════════════════════════════════════════
// Alerts
// ═══════════════════════════════════════════════════════════════

export async function getAlerts(page = 1, limit = 20, showAcknowledged = false) {
    await requireAdmin();

    const supabase = await createServiceRoleClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('safety_alerts')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

    if (!showAcknowledged) {
        query = query.eq('is_acknowledged', false);
    }

    const { data, error, count } = await query;
    if (error) return { error: 'Failed to fetch alerts', alerts: [], count: 0 };
    return { alerts: data || [], count: count || 0 };
}

export async function acknowledgeAlert(alertId: string) {
    const session = await requireAdmin();

    const supabase = await createServiceRoleClient();
    const { error } = await supabase
        .from('safety_alerts')
        .update({
            is_acknowledged: true,
            acknowledged_by: session.username,
            acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alertId);

    if (error) return { error: 'Failed to acknowledge alert' };
    return { success: true };
}

export async function dismissAllAlerts() {
    const session = await requireAdmin();

    const supabase = await createServiceRoleClient();
    const { error } = await supabase
        .from('safety_alerts')
        .update({
            is_acknowledged: true,
            acknowledged_by: session.username,
            acknowledged_at: new Date().toISOString(),
        })
        .eq('is_acknowledged', false);

    if (error) return { error: 'Failed' };
    return { success: true };
}

// ═══════════════════════════════════════════════════════════════
// Watchlist
// ═══════════════════════════════════════════════════════════════

export async function toggleWatchlist(studentUsername: string, reason = '') {
    const session = await requireAdmin();

    const supabase = await createServiceRoleClient();
    const { data: existing } = await supabase
        .from('admin_watchlist')
        .select('id')
        .eq('admin_username', session.username)
        .eq('student_username', studentUsername)
        .single();

    if (existing) {
        await supabase.from('admin_watchlist').delete().eq('id', existing.id);
        return { watching: false };
    } else {
        await supabase.from('admin_watchlist').insert({
            admin_username: session.username,
            student_username: studentUsername,
            reason,
        });
        return { watching: true };
    }
}

export async function getWatchlistStatus(studentUsername: string) {
    const session = await getSession();
    if (!session || session.role !== 'super_admin') return { watching: false };

    const supabase = await createServiceRoleClient();
    const { data } = await supabase
        .from('admin_watchlist')
        .select('id')
        .eq('admin_username', session.username)
        .eq('student_username', studentUsername)
        .single();

    return { watching: !!data };
}

export async function getMyWatchlist() {
    const session = await getSession();
    if (session?.role !== 'super_admin') return [];

    const supabase = await createServiceRoleClient();
    const { data } = await supabase
        .from('admin_watchlist')
        .select('*')
        .eq('admin_username', session.username)
        .order('created_at', { ascending: false });

    return data || [];
}

// ═══════════════════════════════════════════════════════════════
// Student Notes
// ═══════════════════════════════════════════════════════════════

export async function addStudentNote(
    studentUsername: string,
    note: string,
    category: 'general' | 'behavioral' | 'academic' | 'urgent' = 'general'
) {
    const session = await requireAdmin();

    const supabase = await createServiceRoleClient();
    const { data, error } = await supabase
        .from('student_notes')
        .insert({
            admin_username: session.username,
            student_username: studentUsername,
            note_text: note,
            category,
        })
        .select()
        .single();

    if (error) return { error: 'Failed to add note' };
    return { note: data };
}

export async function getStudentNotes(studentUsername: string) {
    await requireAdmin();

    const supabase = await createServiceRoleClient();
    const { data } = await supabase
        .from('student_notes')
        .select('*')
        .eq('student_username', studentUsername)
        .order('created_at', { ascending: false });

    return data || [];
}

export async function deleteStudentNote(noteId: string) {
    await requireAdmin();

    const supabase = await createServiceRoleClient();
    const { error } = await supabase
        .from('student_notes')
        .delete()
        .eq('id', noteId);

    if (error) return { error: 'Failed to delete note' };
    return { success: true };
}

// ═══════════════════════════════════════════════════════════════
// Heatmap & Filters
// ═══════════════════════════════════════════════════════════════

export async function getActivityHeatmapData(username?: string) {
    await requireAdmin();
    return getHeatmap(username);
}

export async function getFilterOptions() {
    await requireAdmin();
    return getAvailableSectionsAndGroups();
}

// ═══════════════════════════════════════════════════════════════
// Full Student Timeline (paginated)
// ═══════════════════════════════════════════════════════════════

export async function getStudentFullTimeline(
    username: string,
    page = 1,
    limit = 100,
    actionType?: string
) {
    await requireAdmin();

    const supabase = await createServiceRoleClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .eq('username', username)
        .order('created_at', { ascending: false })
        .range(from, to);

    if (actionType && actionType !== 'all') {
        query = query.eq('action_type', actionType);
    }

    const { data, error, count } = await query;
    if (error) {
        console.error('Student timeline error:', error.message || error.code || JSON.stringify(error));
        return { logs: [], count: 0 };
    }
    return { logs: data || [], count: count || 0 };
}

// ═══════════════════════════════════════════════════════════════
// Session History (active_sessions table)
// ═══════════════════════════════════════════════════════════════

export async function getStudentSessionHistory(username: string, limit = 50) {
    await requireAdmin();

    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase
        .from('active_sessions')
        .select('*')
        .eq('username', username)
        .order('started_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Session history error:', error.message || error.code || JSON.stringify(error));
        return [];
    }

    return data || [];
}

// ═══════════════════════════════════════════════════════════════
// Security Events (failed logins, unusual activity)
// ═══════════════════════════════════════════════════════════════

export async function getStudentSecurityLog(username: string) {
    await requireAdmin();

    const supabase = await createServiceRoleClient();

    // Get security-relevant activity
    const { data: securityLogs } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('username', username)
        .in('action_type', ['LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGE'])
        .order('created_at', { ascending: false })
        .limit(200);

    // Get unique IPs and user agents
    const ips = new Set<string>();
    const devices = new Set<string>();
    let failedLogins = 0;
    let totalLogins = 0;

    for (const log of securityLogs || []) {
        if (log.ip_address && log.ip_address !== 'unknown') ips.add(log.ip_address);
        if (log.user_agent && log.user_agent !== 'unknown') {
            // Extract browser/device signature
            const ua = log.user_agent;
            const device = ua.includes('Mobile') ? 'Mobile' : ua.includes('Tablet') ? 'Tablet' : 'Desktop';
            const browser = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)/)?.[0] || 'Unknown';
            devices.add(`${device} - ${browser}`);
        }
        if (log.action_type === 'LOGIN_FAILED') failedLogins++;
        if (log.action_type === 'LOGIN') totalLogins++;
    }

    return {
        logs: securityLogs || [],
        summary: {
            uniqueIps: Array.from(ips),
            uniqueDevices: Array.from(devices),
            failedLogins,
            totalLogins,
            ipCount: ips.size,
            deviceCount: devices.size,
        }
    };
}

// ═══════════════════════════════════════════════════════════════
// Academic Progress (quizzes, lessons)
// ═══════════════════════════════════════════════════════════════

export async function getStudentAcademicProgress(username: string) {
    await requireAdmin();

    const supabase = await createServiceRoleClient();

    const [progressRes, quizRes, statsRes] = await Promise.all([
        supabase
            .from('user_progress')
            .select('*')
            .eq('username', username)
            .order('completed_at', { ascending: false }),
        supabase
            .from('user_progress')
            .select('content_id, score, completed_at, xp_earned')
            .eq('username', username)
            .eq('content_type', 'quiz')
            .order('completed_at', { ascending: false }),
        supabase
            .from('user_stats')
            .select('*')
            .eq('username', username)
            .single(),
    ]);

    const progress = progressRes.data || [];
    const quizzes = quizRes.data || [];

    // Calculate grade distribution
    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    for (const q of quizzes) {
        const score = q.score || 0;
        if (score >= 90) gradeDistribution.A++;
        else if (score >= 80) gradeDistribution.B++;
        else if (score >= 70) gradeDistribution.C++;
        else if (score >= 60) gradeDistribution.D++;
        else gradeDistribution.F++;
    }

    // Weekly activity pattern
    const weeklyActivity: Record<string, number> = {};
    for (const p of progress) {
        if (p.completed_at) {
            const week = p.completed_at.substring(0, 10);
            weeklyActivity[week] = (weeklyActivity[week] || 0) + 1;
        }
    }

    return {
        progress,
        quizzes,
        stats: statsRes.data || { total_xp: 0, current_rank: 'E', quizzes_taken: 0 },
        gradeDistribution,
        totalLessonsCompleted: progress.filter(p => p.content_type === 'lesson' && p.status === 'completed').length,
        totalQuizzes: quizzes.length,
        averageQuizScore: quizzes.length > 0
            ? Math.round(quizzes.reduce((s, q) => s + (q.score || 0), 0) / quizzes.length)
            : 0,
    };
}

// ═══════════════════════════════════════════════════════════════
// Chat History for student
// ═══════════════════════════════════════════════════════════════

export async function getStudentChatHistory(username: string, limit = 100) {
    await requireAdmin();

    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase
        .from('guild_messages')
        .select('id, content, created_at, sender_username')
        .eq('sender_username', username)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Chat history error:', error.message || error.code || JSON.stringify(error));
        return [];
    }

    return data || [];
}

// Types should be imported directly from '@/lib/safety/analytics'
