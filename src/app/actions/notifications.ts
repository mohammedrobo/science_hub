'use server';

import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/app/login/actions';
import { revalidatePath } from 'next/cache';

export interface Notification {
    id: string;
    sender_username: string;
    target_section: string | null; // null = All
    title: string;
    message: string;
    created_at: string;
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

    const supabase = await createClient();

    // Query: Get notifications where target_section IS NULL (Everyone) 
    // OR target_section == userSection
    let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (userSection) {
        query = query.or(`target_section.is.null,target_section.eq.${userSection}`);
    } else {
        // If no section (e.g. strict admin or generic user?), just show global
        query = query.is('target_section', null);
    }

    const { data, error } = await query;

    if (error) {
        // If table doesn't exist yet, return empty to avoid crashing UI
        if (error.code === 'PGRST204' || error.message.includes('does not exist')) {
            return defaultData;
        }
        console.error("Fetch Notifications Error:", error);
        return defaultData;
    }

    return data as Notification[];
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
