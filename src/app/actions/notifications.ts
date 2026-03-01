'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { readSession } from '@/lib/auth/session-read';
import { revalidatePath, unstable_cache, updateTag } from 'next/cache';
import { examModeValue } from '@/lib/exam-mode';

export interface Notification {
    id: string;
    sender_username: string;
    target_section: string | null; // null = All
    title: string;
    message: string;
    created_at: string;
    sender_full_name?: string;
    sender_role?: string;
    sender_section?: string | null;
}

type NotificationRow = {
    id: string;
    sender_username: string;
    target_section: string | null;
    title: string;
    message: string;
    created_at: string;
};

const ADMIN_NOTIFICATIONS_TAG = 'notifications-admin';
const SECTION_NOTIFICATIONS_TAG = 'notifications-sections';
const GLOBAL_NOTIFICATIONS_TAG = 'notifications-global';
const NOTIFICATIONS_REVALIDATE_SECONDS = examModeValue(300, 600); // 5m normal, 10m exam mode

function extractSectionFromUsername(username: string): string | null {
    const match = username.match(/^[A-D]_([A-D]\d)/i);
    const section = match ? match[1].toUpperCase() : null;
    return section && /^[A-D][1-4]$/.test(section) ? section : null;
}

async function fetchNotificationsFromDB(
    audience: 'admin' | 'section' | 'global',
    section?: string
): Promise<Notification[]> {
    const supabase = await createServiceRoleClient();

    let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (audience === 'section' && section) {
        query = query.or(`target_section.is.null,target_section.eq.${section}`);
    } else if (audience === 'global') {
        query = query.is('target_section', null);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
        if (error) {
            console.error('Fetch Notifications Error:', error);
        }
        return [];
    }

    const rows = data as NotificationRow[];
    const senderUsernames = [...new Set(rows.map((n) => n.sender_username).filter(Boolean))];

    const { data: users } = await supabase
        .from('allowed_users')
        .select('username, full_name, access_role, original_section')
        .in('username', senderUsernames);

    const userMap = (users || []).reduce((acc: Record<string, { full_name: string; access_role: string; original_section: string | null }>, user) => {
        acc[user.username] = {
            full_name: user.full_name,
            access_role: user.access_role,
            original_section: user.original_section,
        };
        return acc;
    }, {});

    return rows.map((n) => ({
        ...n,
        sender_full_name: userMap[n.sender_username]?.full_name || 'Unknown',
        sender_role: userMap[n.sender_username]?.access_role || 'student',
        sender_section: userMap[n.sender_username]?.original_section || null,
    }));
}

const getAdminNotificationsCached = unstable_cache(
    async () => fetchNotificationsFromDB('admin'),
    ['admin-notifications-v1'],
    { revalidate: NOTIFICATIONS_REVALIDATE_SECONDS, tags: [ADMIN_NOTIFICATIONS_TAG] }
);

const getSectionNotificationsCached = unstable_cache(
    async (section: string) => fetchNotificationsFromDB('section', section),
    ['section-notifications-v1'],
    { revalidate: NOTIFICATIONS_REVALIDATE_SECONDS, tags: [SECTION_NOTIFICATIONS_TAG] }
);

const getGlobalNotificationsCached = unstable_cache(
    async () => fetchNotificationsFromDB('global'),
    ['global-notifications-v1'],
    { revalidate: NOTIFICATIONS_REVALIDATE_SECONDS, tags: [GLOBAL_NOTIFICATIONS_TAG] }
);

function invalidateNotificationCaches() {
    updateTag(ADMIN_NOTIFICATIONS_TAG);
    updateTag(SECTION_NOTIFICATIONS_TAG);
    updateTag(GLOBAL_NOTIFICATIONS_TAG);
}

// Send a notification
export async function sendNotification(
    title: string,
    message: string,
    targetSection: string | null // null for All
) {
    const session = await readSession();
    if (!session) return { error: "Unauthorized" };

    const { username, role } = session;

    // Permission Check
    if (role === 'super_admin' || role === 'admin') {
        // Admin / Super Admin can send to anyone (NULL, group, or specific section)
    } else if (role === 'leader') {
        // Leader MUST have a target section, and it MUST match their own section
        const userSectionMatch = username.match(/^[A-D]_([A-D]\d)/i);
        const userSection = userSectionMatch ? userSectionMatch[1].toUpperCase() : null;

        if (!userSection) {
            return { error: "Could not determine your section." };
        }

        // Force target to be their section
        if (targetSection?.toUpperCase() !== userSection) {
            return { error: "You can only notify your own section." };
        }

    } else {
        return { error: "Students cannot send notifications." };
    }

    const supabase = await createServiceRoleClient();
    const now = new Date().toISOString();

    // Handle group-level targeting: group_A → insert for A1, A2, A3, A4
    const groupMatch = targetSection?.match(/^group_([A-D])$/i);
    if (groupMatch) {
        const group = groupMatch[1].toUpperCase();
        const sections = [`${group}1`, `${group}2`, `${group}3`, `${group}4`];
        const inserts = sections.map(sec => ({
            sender_username: username,
            target_section: sec,
            title,
            message,
            created_at: now
        }));

        const { error } = await supabase
            .from('notifications')
            .insert(inserts);

        if (error) {
            console.error("Send Group Notification Error:", error);
            if (error.message?.includes('schema cache') || error.code === '42P01') {
                return { error: "Notifications table not set up. Run database/schema_notifications.sql" };
            }
            return { error: "Failed to send group notification." };
        }
    } else {
        const { error } = await supabase
            .from('notifications')
            .insert({
                sender_username: username,
                target_section: targetSection ? targetSection.toUpperCase() : null,
                title,
                message,
                created_at: now
            });

        if (error) {
            console.error("Send Notification Error:", error);
            if (error.message?.includes('schema cache') || error.code === '42P01') {
                return { error: "Notifications table not set up. Run database/schema_notifications.sql" };
            }
            return { error: "Failed to send notification." };
        }
    }

    invalidateNotificationCaches();
    revalidatePath('/');
    revalidatePath('/schedule');
    return { success: true };
}

// Fetch notifications for the current user
export async function getNotifications() {
    const session = await readSession();
    if (!session) return [];

    const { username, role } = session;
    const userSection = extractSectionFromUsername(username);

    try {
        if (role === 'super_admin' || role === 'admin') {
            return await getAdminNotificationsCached();
        }
        if (userSection) {
            return await getSectionNotificationsCached(userSection);
        }
        return await getGlobalNotificationsCached();
    } catch (err) {
        console.error("getNotifications error:", err);
        return [];
    }
}

// Delete a notification
export async function deleteNotification(id: string) {
    const session = await readSession();
    if (!session) return { error: "Unauthorized" };

    const { username, role } = session;
    const supabase = await createServiceRoleClient();

    // Fetch the notification first to check ownership
    const { data: notification, error: fetchError } = await supabase
        .from('notifications')
        .select('sender_username')
        .eq('id', id)
        .single();

    if (fetchError || !notification) {
        return { error: "Notification not found." };
    }

    // Permission Check
    if (role === 'super_admin' || role === 'admin') {
        // Admin / Super Admin can delete anything
    } else if (role === 'leader') {
        // Leader can only delete their own
        if (notification.sender_username !== username) {
            return { error: "You can only delete your own notifications." };
        }
    } else {
        return { error: "Unauthorized." };
    }

    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

    if (error) {
        return { error: "Failed to delete notification." };
    }

    invalidateNotificationCaches();
    revalidatePath('/');
    revalidatePath('/schedule');
    return { success: true };
}

// Update a notification
export async function updateNotification(id: string, title: string, message: string) {
    const session = await readSession();
    if (!session) return { error: "Unauthorized" };

    const { username, role } = session;
    const supabase = await createServiceRoleClient();

    // Fetch to check ownership
    const { data: notification, error: fetchError } = await supabase
        .from('notifications')
        .select('sender_username')
        .eq('id', id)
        .single();

    if (fetchError || !notification) {
        return { error: "Notification not found." };
    }

    // Permission Check
    if (role === 'super_admin' || role === 'admin') {
        // Admin / Super Admin can edit anything
    } else if (role === 'leader') {
        if (notification.sender_username !== username) {
            return { error: "You can only edit your own notifications." };
        }
    } else {
        return { error: "Unauthorized." };
    }

    const { error } = await supabase
        .from('notifications')
        .update({ title, message, created_at: new Date().toISOString() }) // Also update timestamp? Maybe not, keep original? Let's update it to bump visibility if needed, or maybe add 'updated_at'. For now, simple update.
        .eq('id', id);

    if (error) {
        return { error: "Failed to update notification." };
    }

    invalidateNotificationCaches();
    revalidatePath('/');
    revalidatePath('/schedule');
    return { success: true };
}

// Clear notifications (Admin clears all, Leader clears their section's notifications)
export async function clearAllNotifications() {
    const session = await readSession();
    if (!session) return { error: "Unauthorized" };

    const { username, role } = session;

    if (role !== 'super_admin' && role !== 'admin' && role !== 'leader') {
        return { error: "Only admins and leaders can clear notifications." };
    }

    // Use service role client to bypass RLS for delete operations
    const supabase = await createServiceRoleClient();
    
    if (role === 'super_admin' || role === 'admin') {
        // Admin clears ALL notifications
        const { error } = await supabase
            .from('notifications')
            .delete()
            .gte('created_at', '1970-01-01');
        
        if (error) {
            console.error("Clear notifications error:", error);
            return { error: "Failed to clear notifications." };
        }
    } else {
        // Leader clears all notifications for their section
        const sectionMatch = username.match(/^[A-D]_([A-D]\d)/i);
        const userSection = sectionMatch ? sectionMatch[1].toUpperCase() : null;
        
        if (!userSection) {
            return { error: "Could not determine your section." };
        }
        
        // Delete notifications targeting this leader's section
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('target_section', userSection);
        
        if (error) {
            console.error("Clear notifications error:", error);
            return { error: "Failed to clear notifications." };
        }
    }

    invalidateNotificationCaches();
    revalidatePath('/');
    revalidatePath('/schedule');
    return { success: true, message: (role === 'super_admin' || role === 'admin') ? 'All notifications cleared' : 'Section notifications cleared' };
}
