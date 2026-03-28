'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { readSession } from '@/lib/auth/session-read';
import { revalidatePath, unstable_cache, revalidateTag } from 'next/cache';
import { examModeValue } from '@/lib/exam-mode';

export interface PollData {
    id: string;
    question: string;
    options: string[];
    allow_multiple: boolean;
    ends_at: string | null;
    votes: { option: number; count: number }[];
    user_vote: number[] | null;
    total_votes: number;
}

export interface Notification {
    id: string;
    sender_username: string;
    target_section: string | null; // null = All
    category: string | null; // course code (e.g. 'P102') or null for general
    type: string; // 'announcement' | 'urgent' | 'reminder' | 'poll'
    is_pinned: boolean;
    title: string;
    message: string;
    created_at: string;
    sender_full_name?: string;
    sender_role?: string;
    sender_section?: string | null;
    poll?: PollData | null;
    is_read?: boolean;
}

type NotificationRow = {
    id: string;
    sender_username: string;
    target_section: string | null;
    category: string | null;
    type: string;
    is_pinned: boolean;
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

async function fetchBaseNotifications(
    audience: 'admin' | 'section' | 'global',
    section?: string
): Promise<Notification[]> {
    const supabase = await createServiceRoleClient();

    let query = supabase
        .from('notifications')
        .select('*')
        .order('is_pinned', { ascending: false })
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
    const notificationIds = rows.map(n => n.id);

    // Fetch sender info
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

    // Fetch polls for these notifications
    const { data: polls } = await supabase
        .from('notification_polls')
        .select('*')
        .in('notification_id', notificationIds);

    const pollMap: Record<string, any> = {};
    const pollIds: string[] = [];
    for (const poll of (polls || [])) {
        pollMap[poll.notification_id] = poll;
        pollIds.push(poll.id);
    }

    // Fetch vote counts per poll per option (Aggregated globally, NO user-specific data here)
    let voteCounts: Record<string, { option: number; count: number }[]> = {};
    let totalVotesMap: Record<string, number> = {};

    if (pollIds.length > 0) {
        const { data: allVotes } = await supabase
            .from('notification_poll_votes')
            .select('poll_id, selected_option, voter_username')
            .in('poll_id', pollIds);

        const voterSets: Record<string, Set<string>> = {};
        for (const vote of (allVotes || [])) {
            if (!voteCounts[vote.poll_id]) voteCounts[vote.poll_id] = [];
            const existing = voteCounts[vote.poll_id].find(v => v.option === vote.selected_option);
            if (existing) {
                existing.count++;
            } else {
                voteCounts[vote.poll_id].push({ option: vote.selected_option, count: 1 });
            }

            // Track unique voters
            if (!voterSets[vote.poll_id]) voterSets[vote.poll_id] = new Set();
            voterSets[vote.poll_id].add(vote.voter_username);
        }
        
        for (const [pollId, set] of Object.entries(voterSets)) {
            totalVotesMap[pollId] = set.size;
        }
    }

    return rows.map((n) => {
        const poll = pollMap[n.id];
        let pollData: PollData | null = null;

        if (poll) {
            pollData = {
                id: poll.id,
                question: poll.question,
                options: poll.options,
                allow_multiple: poll.allow_multiple,
                ends_at: poll.ends_at,
                votes: voteCounts[poll.id] || [],
                user_vote: null, // User votes handled separately to allow caching
                total_votes: totalVotesMap[poll.id] || 0,
            };
        }

        return {
            ...n,
            type: n.type || 'announcement',
            is_pinned: n.is_pinned || false,
            sender_full_name: userMap[n.sender_username]?.full_name || 'Unknown',
            sender_role: userMap[n.sender_username]?.access_role || 'student',
            sender_section: userMap[n.sender_username]?.original_section || null,
            poll: pollData,
        };
    });
}

// Lightweight query for just the current user's votes
async function getUserPollVotes(pollIds: string[], username: string): Promise<Record<string, number[]>> {
    if (pollIds.length === 0) return {};
    const supabase = await createServiceRoleClient();
    const { data } = await supabase
        .from('notification_poll_votes')
        .select('poll_id, selected_option')
        .in('poll_id', pollIds)
        .eq('voter_username', username);
    
    const userVotes: Record<string, number[]> = {};
    for (const vote of (data || [])) {
        if (!userVotes[vote.poll_id]) userVotes[vote.poll_id] = [];
        userVotes[vote.poll_id].push(vote.selected_option);
    }
    return userVotes;
}

// Lightweight query for just the current user's read receipts
async function getUserReadReceipts(notificationIds: string[], username: string): Promise<Set<string>> {
    if (notificationIds.length === 0) return new Set();
    const supabase = await createServiceRoleClient();
    const { data } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .in('notification_id', notificationIds)
        .eq('username', username);
    
    return new Set((data || []).map(r => r.notification_id));
}

// Caching wrappers
const getCachedAdminNotifications = unstable_cache(
    async () => fetchBaseNotifications('admin'),
    [ADMIN_NOTIFICATIONS_TAG],
    { tags: [ADMIN_NOTIFICATIONS_TAG], revalidate: NOTIFICATIONS_REVALIDATE_SECONDS }
);

const getCachedGlobalNotifications = unstable_cache(
    async () => fetchBaseNotifications('global'),
    [GLOBAL_NOTIFICATIONS_TAG],
    { tags: [GLOBAL_NOTIFICATIONS_TAG], revalidate: NOTIFICATIONS_REVALIDATE_SECONDS }
);

const getCachedSectionNotifications = unstable_cache(
    async (section: string) => fetchBaseNotifications('section', section),
    [SECTION_NOTIFICATIONS_TAG],
    { tags: [SECTION_NOTIFICATIONS_TAG], revalidate: NOTIFICATIONS_REVALIDATE_SECONDS }
);

// We now cache the heavy DB aggregate queries, and only fetch user votes dynamically

function invalidateNotificationCaches() {
    // @ts-expect-error Next.js 15/16 typings expect 2 args but runtime supports 1
    revalidateTag(ADMIN_NOTIFICATIONS_TAG);
    // @ts-expect-error Next.js 15/16 typings expect 2 args but runtime supports 1
    revalidateTag(SECTION_NOTIFICATIONS_TAG);
    // @ts-expect-error Next.js 15/16 typings expect 2 args but runtime supports 1
    revalidateTag(GLOBAL_NOTIFICATIONS_TAG);
}

// Send a notification
export async function sendNotification(
    title: string,
    message: string,
    targetSection: string | null, // null for All
    category: string | null = null, // course code or null for general
    type: string = 'announcement', // 'announcement' | 'urgent' | 'reminder' | 'poll'
    pollData?: { question: string; options: string[]; allow_multiple: boolean; ends_at: string | null } | null
) {
    const session = await readSession();
    if (!session) return { error: "Unauthorized" };

    const { username, role } = session;

    // Permission Check
    if (role === 'super_admin' || role === 'admin' || role === 'doctor') {
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
    const notificationType = pollData ? 'poll' : type;

    // Handle group-level targeting: group_A → insert for A1, A2, A3, A4
    const groupMatch = targetSection?.match(/^group_([A-D])$/i);
    if (groupMatch) {
        const group = groupMatch[1].toUpperCase();
        const sections = [`${group}1`, `${group}2`, `${group}3`, `${group}4`];
        const inserts = sections.map(sec => ({
            sender_username: username,
            target_section: sec,
            category: category || null,
            type: notificationType,
            title,
            message,
            created_at: now
        }));

        const { data: insertedRows, error } = await supabase
            .from('notifications')
            .insert(inserts)
            .select('id');

        if (error) {
            console.error("Send Group Notification Error:", error);
            if (error.message?.includes('schema cache') || error.code === '42P01') {
                return { error: "Notifications table not set up. Run database/schema_notifications.sql" };
            }
            return { error: "Failed to send group notification." };
        }

        // Create poll for each inserted notification
        if (pollData && insertedRows) {
            const pollInserts = insertedRows.map((row: any) => ({
                notification_id: row.id,
                question: pollData.question,
                options: pollData.options,
                allow_multiple: pollData.allow_multiple,
                ends_at: pollData.ends_at,
            }));
            await supabase.from('notification_polls').insert(pollInserts);
        }
    } else {
        const { data: insertedRow, error } = await supabase
            .from('notifications')
            .insert({
                sender_username: username,
                target_section: targetSection ? targetSection.toUpperCase() : null,
                category: category || null,
                type: notificationType,
                title,
                message,
                created_at: now
            })
            .select('id')
            .single();

        if (error) {
            console.error("Send Notification Error:", error);
            if (error.message?.includes('schema cache') || error.code === '42P01') {
                return { error: "Notifications table not set up. Run database/schema_notifications.sql" };
            }
            return { error: "Failed to send notification." };
        }

        // Create poll if data provided
        if (pollData && insertedRow) {
            const { error: pollError } = await supabase
                .from('notification_polls')
                .insert({
                    notification_id: insertedRow.id,
                    question: pollData.question,
                    options: pollData.options,
                    allow_multiple: pollData.allow_multiple,
                    ends_at: pollData.ends_at,
                });
            if (pollError) {
                console.error("Create Poll Error:", pollError);
            }
        }
    }

    invalidateNotificationCaches();
    revalidatePath('/');
    revalidatePath('/schedule');
    revalidatePath('/announcements');
    return { success: true };
}

// Fetch notifications for the current user
export async function getNotifications() {
    const session = await readSession();
    if (!session) return [];

    const { username, role } = session;
    const userSection = extractSectionFromUsername(username);

    let baseNotifications: Notification[] = [];
    try {
        if (role === 'super_admin' || role === 'admin' || role === 'doctor') {
            baseNotifications = await getCachedAdminNotifications();
        } else if (userSection) {
            baseNotifications = await getCachedSectionNotifications(userSection);
        } else {
            baseNotifications = await getCachedGlobalNotifications();
        }
    } catch (err) {
        console.error("getNotifications error:", err);
        return [];
    }

    // Identify all notification IDs for read receipts
    const notificationIds = baseNotifications.map(n => n.id);
    
    // Identify which polls we fetched
    const pollIds = baseNotifications.map(n => n.poll?.id).filter(Boolean) as string[];
    
    if (notificationIds.length > 0) {
        try {
            // Fetch dynamically in parallel
            const [userVotes, userReads] = await Promise.all([
                getUserPollVotes(pollIds, username),
                getUserReadReceipts(notificationIds, username)
            ]);
            
            // Return a cloned structure and merge in the dynamic user data
            return baseNotifications.map(n => {
                const read = userReads.has(n.id);
                if (n.poll) {
                    return {
                        ...n,
                        is_read: read,
                        poll: {
                            ...n.poll,
                            user_vote: userVotes[n.poll.id] || null
                        }
                    };
                }
                return { ...n, is_read: read };
            });
        } catch (err) {
            console.error("Dynamic user data fetch error:", err);
            // If the user-specific query fails, return base info
            return baseNotifications;
        }
    }

    return baseNotifications;
}

// Mark a notification as read
export async function markNotificationAsRead(id: string) {
    const session = await readSession();
    if (!session) return { error: "Unauthorized" };

    const supabase = await createServiceRoleClient();
    
    // Attempt to insert read receipt. We ignore unique constraint violations
    // because it just means they already read it.
    const { error } = await supabase
        .from('notification_reads')
        .insert({
            notification_id: id,
            username: session.username,
        });

    if (error && error.code !== '23505') { // 23505 = unique_violation
        console.error("markNotificationAsRead error:", error);
        return { error: "Failed to mark as read" };
    }

    return { success: true };
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
    if (role === 'super_admin' || role === 'admin' || role === 'doctor') {
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
    revalidatePath('/announcements');
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
    if (role === 'super_admin' || role === 'admin' || role === 'doctor') {
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
        .update({ title, message })
        .eq('id', id);

    if (error) {
        return { error: "Failed to update notification." };
    }

    invalidateNotificationCaches();
    revalidatePath('/');
    revalidatePath('/schedule');
    revalidatePath('/announcements');
    return { success: true };
}

// Clear notifications (Admin clears all, Leader clears their section's notifications)
export async function clearAllNotifications() {
    const session = await readSession();
    if (!session) return { error: "Unauthorized" };

    const { username, role } = session;

    if (role !== 'super_admin' && role !== 'admin' && role !== 'doctor' && role !== 'leader') {
        return { error: "Only admins and leaders can clear notifications." };
    }

    // Use service role client to bypass RLS for delete operations
    const supabase = await createServiceRoleClient();
    
    if (role === 'super_admin' || role === 'admin' || role === 'doctor') {
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
    revalidatePath('/announcements');
    return { success: true, message: (role === 'super_admin' || role === 'admin' || role === 'doctor') ? 'All notifications cleared' : 'Section notifications cleared' };
}

// ============ POLL VOTING ============

export async function votePoll(pollId: string, optionIndex: number) {
    const session = await readSession();
    if (!session) return { error: "Unauthorized" };

    const supabase = await createServiceRoleClient();

    // Check poll exists and hasn't ended
    const { data: poll, error: pollError } = await supabase
        .from('notification_polls')
        .select('*')
        .eq('id', pollId)
        .single();

    if (pollError || !poll) {
        return { error: "Poll not found." };
    }

    if (poll.ends_at && new Date(poll.ends_at) < new Date()) {
        return { error: "This poll has ended." };
    }

    const options = poll.options as string[];
    if (optionIndex < 0 || optionIndex >= options.length) {
        return { error: "Invalid option." };
    }

    // If single-choice, remove existing votes first
    if (!poll.allow_multiple) {
        await supabase
            .from('notification_poll_votes')
            .delete()
            .eq('poll_id', pollId)
            .eq('voter_username', session.username);
    }

    // Insert vote (UNIQUE constraint prevents duplicate option votes)
    const { error } = await supabase
        .from('notification_poll_votes')
        .upsert({
            poll_id: pollId,
            voter_username: session.username,
            selected_option: optionIndex,
        }, { onConflict: 'poll_id,voter_username,selected_option' });

    if (error) {
        console.error("Vote Error:", error);
        return { error: "Failed to vote." };
    }

    invalidateNotificationCaches();
    revalidatePath('/announcements');
    return { success: true };
}

export async function removePollVote(pollId: string, optionIndex: number) {
    const session = await readSession();
    if (!session) return { error: "Unauthorized" };

    const supabase = await createServiceRoleClient();

    const { error } = await supabase
        .from('notification_poll_votes')
        .delete()
        .eq('poll_id', pollId)
        .eq('voter_username', session.username)
        .eq('selected_option', optionIndex);

    if (error) {
        return { error: "Failed to remove vote." };
    }

    invalidateNotificationCaches();
    revalidatePath('/announcements');
    return { success: true };
}

// ============ PIN/UNPIN ============

export async function togglePinNotification(id: string) {
    const session = await readSession();
    if (!session) return { error: "Unauthorized" };

    const { role } = session;
    if (role !== 'super_admin' && role !== 'admin' && role !== 'doctor') {
        return { error: "Only admins can pin notifications." };
    }

    const supabase = await createServiceRoleClient();

    const { data: notification, error: fetchError } = await supabase
        .from('notifications')
        .select('is_pinned')
        .eq('id', id)
        .single();

    if (fetchError || !notification) {
        return { error: "Notification not found." };
    }

    const { error } = await supabase
        .from('notifications')
        .update({ is_pinned: !notification.is_pinned })
        .eq('id', id);

    if (error) {
        return { error: "Failed to toggle pin." };
    }

    invalidateNotificationCaches();
    revalidatePath('/');
    revalidatePath('/announcements');
    return { success: true, pinned: !notification.is_pinned };
}

// Get detailed voter info for a poll (admin/super_admin only)
export async function getPollVoterDetails(pollId: string) {
    const session = await readSession();
    if (!session) return { error: "Unauthorized" };

    if (session.role !== 'admin' && session.role !== 'super_admin') {
        return { error: "Only admins can view voter details." };
    }

    const supabase = await createServiceRoleClient();

    // Get all votes for this poll with voter full names
    const { data: votes, error } = await supabase
        .from('notification_poll_votes')
        .select('selected_option, voter_username, allowed_users!inner(full_name)')
        .eq('poll_id', pollId)
        .order('selected_option', { ascending: true });

    if (error) {
        console.error("Get Poll Voter Details Error:", error);
        return { error: "Failed to fetch voter details." };
    }

    // Group voters by option index
    const votersByOption: Record<number, { username: string; fullName: string }[]> = {};
    for (const vote of votes || []) {
        const optIdx = vote.selected_option;
        if (!votersByOption[optIdx]) votersByOption[optIdx] = [];
        votersByOption[optIdx].push({
            username: vote.voter_username,
            fullName: (vote.allowed_users as any)?.full_name || vote.voter_username,
        });
    }

    return { success: true, votersByOption };
}
