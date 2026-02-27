import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { examModeValue } from '@/lib/exam-mode';

const QUIZ_API_S_MAXAGE_SECONDS = examModeValue(3600, 6 * 3600); // 1h normal, 6h exam mode
const QUIZ_API_STALE_SECONDS = examModeValue(86400, 3 * 86400); // 1d normal, 3d exam mode

export const revalidate = 3600;

const CACHE_HEADERS = {
    'Cache-Control': `public, s-maxage=${QUIZ_API_S_MAXAGE_SECONDS}, stale-while-revalidate=${QUIZ_API_STALE_SECONDS}`,
};

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createServiceRoleClient();

        const { data: quiz, error: quizError } = await supabase
            .from('quizzes')
            .select('*')
            .eq('id', id)
            .single();

        if (quizError || !quiz) {
            return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
        }

        const { data: questions, error: questionsError } = await supabase
            .from('questions')
            .select('*')
            .eq('quiz_id', id)
            .order('order_index', { ascending: true });

        if (questionsError) {
            return NextResponse.json({ error: 'Quiz questions unavailable' }, { status: 500 });
        }

        return NextResponse.json(
            {
                ...quiz,
                questions: questions || [],
            },
            { headers: CACHE_HEADERS }
        );
    } catch (error) {
        console.error('Quiz API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
