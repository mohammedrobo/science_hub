import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: sessions, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(sessions);

    } catch (error) {
        console.error('Error fetching sessions:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const { title } = body;

        const { data: session, error } = await supabase
            .from('chat_sessions')
            .insert({
                user_id: user.id,
                title: title || 'New Chat',
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(session);

    } catch (error) {
        console.error('Error creating session:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
