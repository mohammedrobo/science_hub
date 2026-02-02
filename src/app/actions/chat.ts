'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getSession } from '@/app/login/actions';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

export async function saveChatMessage(role: 'user' | 'assistant', content: string) {
    const session = await getSession();
    if (!session?.username) return { error: 'Not authenticated' };

    const supabase = await createServiceRoleClient();

    const { error } = await supabase.from('chat_messages').insert({
        username: session.username,
        user_id: '00000000-0000-0000-0000-000000000000', // Using constant UUID as allowed_users uses username PK
        role,
        content
    });

    if (error) {
        console.error('Error saving chat message:', error);
        return { error: 'Failed to save message' };
    }

    return { success: true };
}

export async function getChatHistory(): Promise<{ messages: ChatMessage[]; error?: string }> {
    const session = await getSession();
    if (!session?.username) return { messages: [], error: 'Not authenticated' };

    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at')
        .eq('username', session.username)
        .order('created_at', { ascending: true })
        .limit(50);

    if (error) {
        console.error('Error fetching chat history:', error);
        return { messages: [], error: 'Failed to fetch history' };
    }

    // Map to ensure types align perfectly
    const messages = data.map((msg: any) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        created_at: msg.created_at
    }));

    return { messages };
}
