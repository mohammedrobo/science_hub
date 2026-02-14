import { createServiceRoleClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export type ActionType =
    | 'LOGIN'
    | 'LOGIN_FAILED'
    | 'LOGOUT'
    | 'PROFILE_UPDATE'
    | 'QUIZ_ATTEMPT'
    | 'QUIZ_SUBMIT'
    | 'LESSON_VIEW'
    | 'LESSON_COMPLETE'
    | 'REPORT_SUBMITTED'
    | 'ADMIN_ACTION'
    | 'PAGE_VIEW'
    | 'CHAT_MESSAGE'
    | 'CHAT_AI'
    | 'SCHEDULE_VIEW'
    | 'PASSWORD_CHANGE'
    | 'PROFILE_PIC_CHANGE'
    | 'COURSE_VIEW'
    | 'CONTENT_DOWNLOAD'
    | 'GUILD_ACTION'
    | 'NICKNAME_CHANGE';

interface LogEntry {
    action: ActionType;
    username: string; // We log the username explicitly in case the user ID changes or is deleted
    userId?: string;
    details?: Record<string, any>;
    severity?: 'INFO' | 'WARNING' | 'CRITICAL';
}

/**
 * Logs a user action to the activity_logs table.
 * Uses Service Role to bypass potential RLS issues (though RLS allows insert).
 * Awaitable: callers can choose to await or fire-and-forget.
 */
export async function logActivity(entry: LogEntry) {
    try {
        const supabase = await createServiceRoleClient();
        const headersList = await headers();

        // Try to get IP address from various headers
        const ip = headersList.get('x-forwarded-for')?.split(',')[0] ||
            headersList.get('x-real-ip') ||
            'unknown';

        const userAgent = headersList.get('user-agent') || 'unknown';

        const { error } = await supabase.from('activity_logs').insert({
            user_id: entry.userId,
            username: entry.username,
            action_type: entry.action,
            details: entry.details || {},
            ip_address: ip,
            user_agent: userAgent,
        });

        if (error) {
            console.error('[SafetyLogger] Failed to write log:', error);
        }
    } catch (error) {
        console.error('[SafetyLogger] Critical error:', error);
    }
}
