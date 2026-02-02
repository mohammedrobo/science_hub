'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getSession } from '@/app/login/actions';
import { revalidatePath } from 'next/cache';

async function ensureLeaderOrAdmin() {
    const session = await getSession();
    if (!session?.role || !['admin', 'leader'].includes(session.role)) {
        throw new Error('Unauthorized: Guild Access Required');
    }
    return session;
}

export async function createQuest(data: { title: string; description: string; assigned_to?: string }) {
    try {
        const session = await ensureLeaderOrAdmin();
        const supabase = await createServiceRoleClient();

        const { error } = await supabase
            .from('guild_quests')
            .insert({
                title: data.title,
                description: data.description,
                assigned_to: data.assigned_to || null,
                created_by: session.username,
                status: 'pending'
            });

        if (error) {
            console.error('Create Quest Error:', error);
            return { error: 'Failed to create quest' };
        }

        revalidatePath('/admin/guild');
        return { success: true };
    } catch (e: any) {
        return { error: e.message || 'Server error' };
    }
}

export async function updateQuestStatus(id: string, status: 'pending' | 'in_progress' | 'completed') {
    try {
        await ensureLeaderOrAdmin();
        const supabase = await createServiceRoleClient();

        const { error } = await supabase
            .from('guild_quests')
            .update({ status })
            .eq('id', id);

        if (error) {
            console.error('Update Status Error:', error);
            return { error: 'Failed to update status' };
        }

        revalidatePath('/admin/guild');
        return { success: true };
    } catch (e: any) {
        return { error: e.message || 'Server error' };
    }
}

export async function deleteQuest(id: string) {
    try {
        await ensureLeaderOrAdmin();
        const supabase = await createServiceRoleClient();

        const { error } = await supabase
            .from('guild_quests')
            .delete()
            .eq('id', id);

        if (error) throw error;
        revalidatePath('/admin/guild');
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function sendGuildMessage(content: string) {
    try {
        const session = await ensureLeaderOrAdmin();
        const supabase = await createServiceRoleClient();

        const { error } = await supabase
            .from('guild_messages')
            .insert({
                sender_username: session.username,
                content: content
            });

        if (error) {
            console.error('Send Message Error:', error);
            return { error: 'Failed to send message' };
        }

        // No revalidatePath needed if we rely on Realtime, but good for fallback
        return { success: true };
    } catch (e: any) {
        return { error: e.message || 'Server error' };
    }
}

// ... (imports)

// Helper to check message ownership or admin status
async function canManageMessage(messageId: string, action: 'delete' | 'update') {
    const session = await ensureLeaderOrAdmin();
    const supabase = await createServiceRoleClient();

    const { data: message } = await supabase
        .from('guild_messages')
        .select('sender_username')
        .eq('id', messageId)
        .single();

    if (!message) throw new Error('Message not found');

    const isOwner = message.sender_username === session.username;
    const isAdmin = session.role === 'admin';

    if (action === 'delete') {
        if (!isOwner && !isAdmin) {
            throw new Error('Unauthorized: You can only delete your own messages');
        }
    } else if (action === 'update') {
        if (!isOwner) { // Only owner can edit, not even admin (usually)
            throw new Error('Unauthorized: You can only edit your own messages');
        }
    }
}

export async function deleteGuildMessage(id: string) {
    try {
        await canManageMessage(id, 'delete');
        const supabase = await createServiceRoleClient();

        const { error } = await supabase
            .from('guild_messages')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Delete Message Error:', error);
            return { error: 'Failed to delete message' };
        }

        return { success: true };
    } catch (e: any) {
        return { error: e.message || 'Server error' };
    }
}

export async function updateGuildMessage(id: string, content: string) {
    try {
        await canManageMessage(id, 'update');
        const supabase = await createServiceRoleClient();

        // ... existing update logic
        const { error } = await supabase
            .from('guild_messages')
            .update({ content })
            .eq('id', id);

        if (error) {
            console.error('Update Message Error:', error);
            return { error: 'Failed to update message' };
        }

        return { success: true };
    } catch (e: any) {
        return { error: e.message || 'Server error' };
    }
}

export async function clearCompletedQuests() {
    try {
        const session = await ensureLeaderOrAdmin();

        if (session.role !== 'admin') {
            throw new Error('Unauthorized: Admin Access Required');
        }

        const supabase = await createServiceRoleClient();

        const { error } = await supabase
            .from('guild_quests')
            .delete()
            .eq('status', 'completed');

        if (error) {
            console.error('Clear History Error:', error);
            return { error: 'Failed to clear history' };
        }

        revalidatePath('/admin/guild');
        return { success: true };
    } catch (e: any) {
        return { error: e.message || 'Server error' };
    }
}

export async function updateUserNickname(username: string, nickname: string) {
    try {
        const session = await ensureLeaderOrAdmin();

        // Allow if Admin OR if user is updating themselves
        const isSelfUpdate = session.username === username;
        const isAdmin = session.role === 'admin';

        if (!isAdmin && !isSelfUpdate) {
            throw new Error('Unauthorized: You can only update your own nickname');
        }

        const supabase = await createServiceRoleClient();

        const { error } = await supabase
            .from('allowed_users')
            .update({ nickname: nickname || null }) // Allow clearing nickname
            .eq('username', username);

        if (error) {
            console.error('Update Nickname DB Error:', error);
            return { error: `Failed to update: ${error.message}` };
        }

        revalidatePath('/admin/guild');
        return { success: true };
    } catch (e: any) {
        return { error: e.message || 'Server error' };
    }
}
