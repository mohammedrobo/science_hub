'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getSession } from '@/app/login/actions';
import { revalidatePath } from 'next/cache';

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

// Send a notification
export async function sendNotification(
    title: string,
    message: string,
    targetSection: string | null // null for All
) {
    const session = await getSession();
    if (!session) return { error: "Unauthorized" };

    const { username, role } = session;

    // Permission Check
    if (role === 'admin') {
        // Admin can send to anyone (NULL or specific)
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

    const supabase = await createClient();
    const { error } = await supabase
        .from('notifications')
        .insert({
            sender_username: username,
            target_section: targetSection ? targetSection.toUpperCase() : null,
            title,
            message,
            created_at: new Date().toISOString()
        });

    if (error) {
        console.error("Send Notification Error:", error);
        // Check if table doesn't exist
        if (error.message?.includes('schema cache') || error.code === '42P01') {
            return { error: "Notifications table not set up. Run database/schema_notifications.sql" };
        }
        return { error: "Failed to send notification." };
    }

    revalidatePath('/');
    revalidatePath('/schedule');
    return { success: true };
}

// Fetch notifications for the current user
export async function getNotifications() {
    const session = await getSession();
    const defaultData: Notification[] = []; // Fallback

    if (!session) return defaultData;

    const { username, role } = session;

    // Determine user's section
    // Format: "C_C2-..." -> "C2"
    const sectionMatch = username.match(/^[A-D]_([A-D]\d)/i);
    const userSection = sectionMatch ? sectionMatch[1].toUpperCase() : null;

    try {
        const supabase = await createClient();

        // Query notifications - fetch separately from users to avoid FK join issues
        let query = supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

    // Admin sees ALL notifications to review them
    // Leader sees their section + global
    // Student sees their section + global
    if (role === 'admin') {
        // No filter - admin sees everything
    } else if (userSection) {
        query = query.or(`target_section.is.null,target_section.eq.${userSection}`);
    } else {
        query = query.is('target_section', null);
    }

    const { data, error } = await query;

    if (error) {
        if (error.code === 'PGRST204' || error.message.includes('does not exist') || error.message.includes('schema cache')) {
            return defaultData;
        }
        console.error("Fetch Notifications Error:", error);
        return defaultData;
    }

    if (!data || data.length === 0) return defaultData;

    // Fetch sender details separately
    const senderUsernames = [...new Set(data.map((n: any) => n.sender_username))];
    const { data: users } = await supabase
        .from('allowed_users')
        .select('username, full_name, access_role, original_section')
        .in('username', senderUsernames);

    const userMap = (users || []).reduce((acc: any, user: any) => {
        acc[user.username] = user;
        return acc;
    }, {});

    // Map the data to include sender details
    return data.map((n: any) => ({
        ...n,
        sender_full_name: userMap[n.sender_username]?.full_name || 'Unknown',
        sender_role: userMap[n.sender_username]?.access_role || 'student',
        sender_section: userMap[n.sender_username]?.original_section
    })) as Notification[];
    } catch (err) {
        // Table doesn't exist or other error - return empty array
        console.error("getNotifications error:", err);
        return defaultData;
    }
}

// Delete a notification
export async function deleteNotification(id: string) {
    const session = await getSession();
    if (!session) return { error: "Unauthorized" };

    const { username, role } = session;
    const supabase = await createClient();

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
    if (role === 'admin') {
        // Admin can delete anything
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

    revalidatePath('/');
    revalidatePath('/schedule');
    return { success: true };
}

// Update a notification
export async function updateNotification(id: string, title: string, message: string) {
    const session = await getSession();
    if (!session) return { error: "Unauthorized" };

    const { username, role } = session;
    const supabase = await createClient();

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
    if (role === 'admin') {
        // Admin can edit anything
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

    revalidatePath('/');
    revalidatePath('/schedule');
    return { success: true };
}

// Clear notifications (Admin clears all, Leader clears their section's notifications)
export async function clearAllNotifications() {
    const session = await getSession();
    if (!session) return { error: "Unauthorized" };

    const { username, role } = session;

    if (role !== 'admin' && role !== 'leader') {
        return { error: "Only admins and leaders can clear notifications." };
    }

    // Use service role client to bypass RLS for delete operations
    const supabase = await createServiceRoleClient();
    
    if (role === 'admin') {
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

    revalidatePath('/');
    revalidatePath('/schedule');
    return { success: true, message: role === 'admin' ? 'All notifications cleared' : 'Section notifications cleared' };
}
