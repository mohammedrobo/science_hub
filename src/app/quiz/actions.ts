'use server';

import { createClient } from '@/lib/supabase/server';

export async function getQuiz(quizId: string) {
    const supabase = await createClient();

    // 1. Get Quiz Details
    const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

    if (quizError || !quiz) {
        console.error("Fetch Quiz Error:", quizError);
        return null; // Or throw
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
}
