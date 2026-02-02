import { createServiceRoleClient } from '@/lib/supabase/server';

export async function getStudentContext(username: string): Promise<string> {
    const supabase = await createServiceRoleClient();

    // 1. Fetch completed quizzes
    const { data: progress } = await supabase
        .from('user_progress')
        .select('content_id, score, completed_at')
        .eq('username', username)
        .eq('content_type', 'quiz')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(10); // Limit to recent 10 for context window efficiency

    if (!progress || progress.length === 0) {
        return "";
    }

    // 2. Fetch Quiz Details
    const quizIds = progress.map(p => p.content_id);
    const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, title, course_id')
        .in('id', quizIds);

    if (!quizzes) return "";

    // 3. Fetch Course Details
    const courseIds = [...new Set(quizzes.map(q => q.course_id))];
    const { data: courses } = await supabase
        .from('courses')
        .select('id, name')
        .in('id', courseIds);

    // 4. Construct Context String
    let context = "Student's Recent Academic Record:\n";

    progress.forEach(p => {
        const quiz = quizzes.find(q => q.id === p.content_id);
        const course = courses?.find(c => c.id === quiz?.course_id);

        if (quiz) {
            context += `- Quiz: "${quiz.title}" (${course?.name || 'General'}). Score: ${p.score}%. Date: ${new Date(p.completed_at).toLocaleDateString()}\n`;
        }
    });

    context += "\n(Use this data to give specific feedback. If the score is high (>80%), praise them. If low, offer to explain the topic.)";

    return context;
}
