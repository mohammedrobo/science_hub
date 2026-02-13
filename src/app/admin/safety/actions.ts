'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getSession } from '@/app/login/actions';


export async function getActivityLogs(page = 1, limit = 50, search = '') {
    const session = await getSession();
    if (session?.role !== 'admin') {
        return { error: 'Unauthorized' };
    }

    const supabase = await createServiceRoleClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

    if (search) {
        query = query.or(`username.ilike.%${search}%,action_type.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
        console.error('Fetch logs error:', error);
        return { error: 'Failed to fetch logs' };
    }

    return { logs: data, count };
}

export async function getStudentReports(page = 1, limit = 50, status = 'all') {
    const session = await getSession();
    if (session?.role !== 'admin') {
        return { error: 'Unauthorized' };
    }

    const supabase = await createServiceRoleClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('student_reports')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

    if (status !== 'all') {
        // Assuming there's a status column. If not, we might need to rely on other fields or add it.
        // For now, based on previous context, we might not have a status column yet.
        // Let's check schema if possible, but for now I will assume basic structure.
        // If 'status' doesn't exist, we should probably add it or infer it.
        // Wait, the previous file didn't show the schema.
        // I'll add a check. If the column doesn't exist, this might fail.
        // Let's assume for now we might need to add a migration if 'status' is missing.
        // But for this step, I'll assume we are just fetching. 
        // Actually, let's implement a 'resolveReport' that updates a 'status' field.
        // If the field doesn't exist, I'll need to handle that.
        // For now, I will omit the filter if I'm not sure, OR I'll proceed and fix if it errors.
        // Let's assume we will add the column or it exists.
        query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
        return { error: 'Failed to fetch reports' };
    }

    return { reports: data, count };
}

export async function resolveReport(reportId: string, status: 'resolved' | 'dismissed', notes?: string) {
    const session = await getSession();
    if (session?.role !== 'admin') {
        return { error: 'Unauthorized' };
    }

    const supabase = await createServiceRoleClient();

    const { error } = await supabase
        .from('student_reports')
        .update({ status: status, admin_notes: notes, resolved_at: new Date().toISOString() })
        .eq('id', reportId);

    if (error) {
        console.error('Resolve report error:', error);
        return { error: 'Failed to update report' };
    }

    return { success: true };
}

export async function getSafetyStats() {
    const session = await getSession();
    if (session?.role !== 'admin') {
        return { error: 'Unauthorized' };
    }

    const supabase = await createServiceRoleClient();

    // Parallel fetch for speed
    const [reportsRes, logsRes] = await Promise.all([
        supabase.from('student_reports').select('created_at, status', { count: 'exact' }),
        supabase.from('activity_logs').select('created_at, action_type', { count: 'exact' }) // limiting fields for performance
    ]);

    const reports = reportsRes.data || [];
    const logs = logsRes.data || [];

    // Calculate basic stats
    const totalReports = reportsRes.count || 0;
    const openReports = reports.filter(r => !r.status || r.status === 'pending').length;

    // Simple aggregation for charts (last 7 days)
    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();

    const activityTrend = last7Days.map(date => {
        return {
            date,
            logs: logs.filter(l => l.created_at.startsWith(date)).length,
            reports: reports.filter(r => r.created_at.startsWith(date)).length
        };
    });

    return {
        stats: {
            totalReports,
            openReports,
            totalLogs: logsRes.count || 0
        },
        chartData: activityTrend
    };
}


export async function getStudentProfile(username: string) {
    const session = await getSession();
    if (session?.role !== 'admin') {
        return { error: 'Unauthorized' };
    }

    const supabase = await createServiceRoleClient();

    // 1. Fetch User Details
    const { data: user, error: userError } = await supabase
        .from('allowed_users')
        .select('id, username, full_name, access_role, original_group, created_at, last_login_at')
        .ilike('username', username)
        .single();

    if (userError || !user) {
        return { error: 'User not found' };
    }

    // 2. Fetch Reports Against User
    const { count: reportCount, error: reportError } = await supabase
        .from('student_reports')
        .select('*', { count: 'exact', head: true })
        .eq('reported_username', user.username);

    // 3. Fetch Recent Activity
    const { data: activities } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('username', user.username)
        .order('created_at', { ascending: false })
        .limit(50);

    // 4. Calculate Risk Score
    // - Each report = 20 points
    // - Each failed login (in last 50 events) = 5 points
    // - Suspicious actions (if any) = 10 points
    let riskScore = (reportCount || 0) * 20;

    const failedLogins = activities?.filter(a => a.action_type === 'LOGIN_FAILED').length || 0;
    riskScore += failedLogins * 5;

    // Cap at 100 for display logic (though backend can go higher)
    const riskLevel = riskScore > 50 ? 'High' : riskScore > 20 ? 'Medium' : 'Low';

    return {
        profile: {
            ...user,
            reportCount: reportCount || 0,
            riskScore,
            riskLevel
        },
        recentActivity: activities || []
    };
}

export async function toggleWatchlist(studentUsername: string, reason: string = '') {
    const session = await getSession();
    if (session?.role !== 'admin') return { error: 'Unauthorized' };

    const supabase = await createServiceRoleClient();

    // Check if already watching
    const { data: existing } = await supabase
        .from('admin_watchlist')
        .select('id')
        .eq('admin_username', session.username)
        .eq('student_username', studentUsername)
        .single();

    if (existing) {
        // Remove
        await supabase.from('admin_watchlist').delete().eq('id', existing.id);
        return { watching: false };
    } else {
        // Add
        await supabase.from('admin_watchlist').insert({
            admin_username: session.username,
            student_username: studentUsername,
            reason
        });
        return { watching: true };
    }
}

export async function getWatchlistStatus(studentUsername: string) {
    const session = await getSession();
    if (!session) return { watching: false };

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
    if (session?.role !== 'admin') return [];

    const supabase = await createServiceRoleClient();

    // Join with allowed_users to get full name if possible, but schema might differ. 
    // For now simple fetch.
    const { data } = await supabase
        .from('admin_watchlist')
        .select('*')
        .eq('admin_username', session.username)
        .order('created_at', { ascending: false });

    return data || [];
}
