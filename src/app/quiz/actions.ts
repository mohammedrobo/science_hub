'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { unstable_cache } from 'next/cache';
import { examModeValue } from '@/lib/exam-mode';

const QUIZ_CACHE_REVALIDATE_SECONDS = examModeValue(300, 1800); // 5m normal, 30m exam mode

const getQuizCached = unstable_cache(
    async (quizId: string) => {
        const supabase = await createServiceRoleClient();

        // 1. Get Quiz Details
        const { data: quiz, error: quizError } = await supabase
            .from('quizzes')
            .select('*')
            .eq('id', quizId)
            .single();

        if (quizError || !quiz) {
            console.error("Fetch Quiz Error:", quizError);
            return null;
        }

        // 2. Get Questions
        const { data: questions, error: qError } = await supabase
            .from('questions')
            .select('*')
            .eq('quiz_id', quizId)
            .order('order_index', { ascending: true });

        if (qError) {
            console.error("Fetch Questions Error:", qError);
            return null;
        }

        return {
            ...quiz,
            questions: questions || []
        };
    },
    ['quiz-content-v1'],
    { revalidate: QUIZ_CACHE_REVALIDATE_SECONDS, tags: ['lessons'] }
);

export async function getQuiz(quizId: string) {
    return getQuizCached(quizId);
}
