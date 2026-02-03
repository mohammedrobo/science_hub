'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getSchedule, type ScheduleEntry } from '@/app/schedule/actions';

const SECTIONS = [
    'A1', 'A2', 'A3', 'A4',
    'B1', 'B2', 'B3', 'B4',
    'C1', 'C2', 'C3', 'C4',
    'D1', 'D2', 'D3', 'D4'
];

// SECURITY: Rate limiting for notifications (prevent spam)
const notificationHistory = new Map<string, number>();
const NOTIFICATION_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

interface ScheduleNotification {
    section_id: string;
    title: string;
    message: string;
    class_subject: string;
    class_type: string;
    class_time: string;
    room?: string;
    notification_type: 'upcoming' | 'starting' | 'reminder';
}

// SECURITY: Validate and sanitize notification content
function sanitizeText(text: string, maxLength: number = 200): string {
    return text
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[<>\"'&]/g, '') // Remove potential XSS chars
        .slice(0, maxLength)
        .trim();
}

// Send notification to a section about upcoming class
export async function sendClassNotification(notification: ScheduleNotification) {
    // SECURITY: Validate section ID
    const sectionId = notification.section_id.toUpperCase();
    if (!SECTIONS.includes(sectionId)) {
        console.warn(`[SECURITY] Invalid section in notification: ${sectionId}`);
        return { error: 'Invalid section' };
    }
    
    // SECURITY: Check rate limit to prevent spam
    const notifyKey = `${sectionId}_${notification.class_subject}_${notification.class_time}`;
    const lastNotified = notificationHistory.get(notifyKey);
    const now = Date.now();
    
    if (lastNotified && (now - lastNotified) < NOTIFICATION_COOLDOWN_MS) {
        // Already sent recently, skip
        return { skipped: true, reason: 'cooldown' };
    }
    
    const supabase = await createServiceRoleClient();
    
    // SECURITY: Sanitize all text content
    const { error } = await supabase
        .from('notifications')
        .insert({
            sender_username: 'SYSTEM',
            target_section: sectionId,
            title: sanitizeText(notification.title, 100),
            message: sanitizeText(notification.message, 500),
            created_at: new Date().toISOString()
        });
    
    if (error) {
        console.error('Error sending class notification:', error);
        return { error: error.message };
    }
    
    // Update rate limit tracking
    notificationHistory.set(notifyKey, now);
    
    // Clean up old entries periodically
    if (Math.random() < 0.1) {
        for (const [key, time] of notificationHistory.entries()) {
            if ((now - time) > NOTIFICATION_COOLDOWN_MS * 2) {
                notificationHistory.delete(key);
            }
        }
    }
    
    return { success: true };
}

// Check and send notifications for upcoming classes (run this every 15 minutes via cron)
export async function checkAndNotifyUpcomingClasses() {
    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[now.getDay()];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    
    const notifications: ScheduleNotification[] = [];
    
    for (const sectionId of SECTIONS) {
        const schedule = await getSchedule(sectionId);
        const todaySchedule = schedule[today] || [];
        
        for (const entry of todaySchedule) {
            const startHour = parseInt(entry.time_start || '0');
            const startMinutes = startHour * 60;
            const minutesUntil = startMinutes - currentTotalMinutes;
            
            // 15 minute reminder
            if (minutesUntil >= 13 && minutesUntil <= 17) {
                notifications.push({
                    section_id: sectionId,
                    title: `⏰ Class in 15 Minutes`,
                    message: `${entry.subject} (${entry.class_type}) starts at ${entry.time_start}:00${entry.room ? ` in Room ${entry.room}` : ''}. Get ready!`,
                    class_subject: entry.subject,
                    class_type: entry.class_type,
                    class_time: entry.time_start || '',
                    room: entry.room,
                    notification_type: 'upcoming'
                });
            }
            
            // 5 minute warning
            if (minutesUntil >= 3 && minutesUntil <= 7) {
                notifications.push({
                    section_id: sectionId,
                    title: `🔔 Class Starting NOW!`,
                    message: `${entry.subject} (${entry.class_type}) starts in 5 minutes!${entry.room ? ` Room ${entry.room}` : ''} Hurry up!`,
                    class_subject: entry.subject,
                    class_type: entry.class_type,
                    class_time: entry.time_start || '',
                    room: entry.room,
                    notification_type: 'starting'
                });
            }
        }
    }
    
    // Send all notifications
    const results = await Promise.all(
        notifications.map(n => sendClassNotification(n))
    );
    
    return {
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => r.error).length,
        notifications
    };
}

// Get upcoming classes for all sections (for dashboard/admin view)
export async function getAllUpcomingClasses() {
    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[now.getDay()];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    
    const upcoming: Array<{
        section: string;
        class: ScheduleEntry;
        minutesUntil: number;
        status: 'current' | 'upcoming';
    }> = [];
    
    for (const sectionId of SECTIONS) {
        const schedule = await getSchedule(sectionId);
        const todaySchedule = schedule[today] || [];
        
        for (const entry of todaySchedule) {
            const startHour = parseInt(entry.time_start || '0');
            const endHour = parseInt(entry.time_end || '0');
            const startMinutes = startHour * 60;
            const endMinutes = endHour * 60;
            
            if (currentTotalMinutes >= startMinutes && currentTotalMinutes < endMinutes) {
                upcoming.push({
                    section: sectionId,
                    class: entry,
                    minutesUntil: 0,
                    status: 'current'
                });
            } else if (currentTotalMinutes < startMinutes) {
                upcoming.push({
                    section: sectionId,
                    class: entry,
                    minutesUntil: startMinutes - currentTotalMinutes,
                    status: 'upcoming'
                });
            }
        }
    }
    
    // Sort by minutes until
    upcoming.sort((a, b) => a.minutesUntil - b.minutesUntil);
    
    return upcoming;
}

// Manual trigger for testing - ADMIN ONLY
export async function sendTestClassNotification(sectionId: string) {
    // SECURITY: Validate section ID
    const normalizedSection = sectionId.toUpperCase();
    if (!SECTIONS.includes(normalizedSection)) {
        console.warn(`[SECURITY] Invalid section in test notification: ${sectionId}`);
        return { error: 'Invalid section' };
    }

    // SECURITY: Verify admin access
    const supabase = await createServiceRoleClient();
    const { cookies: getCookies } = await import('next/headers');
    const cookieStore = await getCookies();
    const sessionCookie = cookieStore.get('sciencehub_session')?.value;
    
    if (!sessionCookie) {
        return { error: 'Unauthorized' };
    }
    
    // Verify user is admin
    const { data: session } = await supabase
        .from('sessions')
        .select('user_id')
        .eq('session_token', sessionCookie)
        .eq('is_active', true)
        .single();
    
    if (!session) {
        return { error: 'Unauthorized' };
    }
    
    const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user_id)
        .single();
    
    if (!user || user.role !== 'admin') {
        console.warn(`[SECURITY] Non-admin attempted test notification: ${session.user_id}`);
        return { error: 'Admin access required' };
    }

    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[now.getDay()];
    
    const schedule = await getSchedule(normalizedSection);
    const todaySchedule = schedule[today] || [];
    
    if (todaySchedule.length === 0) {
        return { error: 'No classes today for this section' };
    }
    
    const nextClass = todaySchedule[0];
    
    console.log(`[ADMIN] Test notification sent for ${normalizedSection} by user ${session.user_id}`);
    
    return sendClassNotification({
        section_id: normalizedSection,
        title: `📚 Test Notification`,
        message: `This is a test! Your next class is ${nextClass.subject} (${nextClass.class_type}) at ${nextClass.time_start}:00`,
        class_subject: nextClass.subject,
        class_type: nextClass.class_type,
        class_time: nextClass.time_start || '',
        room: nextClass.room,
        notification_type: 'upcoming'
    });
}
