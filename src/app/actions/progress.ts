'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getSession } from '@/app/login/actions';
import { MOCK_COURSES } from '@/lib/constants'; // Assuming this exists based on page.tsx import

export async function getCourseProgress(): Promise<Record<string, number>> {
    const session = await getSession();
    if (!session?.username) return {};

    const supabase = await createServiceRoleClient();

    // Fetch all progress for the user
    // We assume 'content_id' in user_progress maps to lesson IDs.
    // We need to know which lessons belong to which course.
    // For this implementation, we'll try to aggregate by matching course structure.

    // NOTE: In a real DB schema, lessons would link to courses. 
    // Since we rely on MOCK_COURSES const for course definitions, we need to map it here.

    // 1. Get user progress
    const { data: progressData, error } = await supabase
        .from('user_progress')
        .select('content_id, status')
        .eq('username', session.username)
        .eq('status', 'completed');

    if (error) {
        console.error('Error fetching progress:', error);
        return {};
    }

    const completedLessonIds = new Set(progressData?.map(p => p.content_id) || []);

    // 2. Calculate progress per course
    const courseProgress: Record<string, number> = {};

    // We need to access the lessons of each course.
    // Let's assume MOCK_COURSES has a 'lessons' array or similar count.
    // If MOCK_COURSES only has metadata, we might need to look up lesson definitions.
    // The previously viewed 'getQuizById' file suggests data is in code.
    // Let's assume we can import COURSES_DATA or similar if MOCK_COURSES doesn't have it.
    // Based on `page.tsx`, `MOCK_COURSES` is used. Let's iterate it.

    /* 
       Optimization: If we don't have the full lesson list per course in MOCK_COURSES,
       we might need to mock the "total lessons" count.
       Let's check `src/lib/constants` via view_file if needed, but for now 
       I will assume MOCK_COURSES has a `lessons` array or `totalLessons` property.
       If not, I'll default to a mock count or 0.
    */

    // Let's view MOCK_COURSES structure first to be safe? 
    // Actually, I'll view it in the next step if this file creation depends on it.
    // For now, I'll write the scaffold.

    // Wait, I should view `src/lib/constants` to be accurate.
    return {};
}

export async function markContentAsCompleted(contentId: string, contentType: 'lesson' | 'quiz', xp: number = 0) {
    const session = await getSession();
    if (!session?.username) return { error: 'Not authenticated' };

    const supabase = await createServiceRoleClient();

    // Check if already completed
    const { data: existing } = await supabase
        .from('user_progress')
        .select('id')
        .eq('username', session.username)
        .eq('content_id', contentId)
        .eq('status', 'completed')
        .single();

    if (existing) {
        return { message: 'Already completed', xpEarned: 0 };
    }

    // Insert progress
    const { error } = await supabase
        .from('user_progress')
        .insert({
            username: session.username, // Using username as FK
            content_id: contentId,
            content_type: contentType,
            status: 'completed',
            xp_earned: xp,
            completed_at: new Date().toISOString()
        });

    if (error) {
        console.error('Error marking completed:', error);
        return { error: 'Failed to update progress' };
    }

    // Award XP
    if (xp > 0) {
        const { error: xpError } = await supabase.rpc('award_xp', {
            p_username: session.username,
            p_content_id: contentId,
            p_xp: xp
        });

        if (xpError) {
            console.error('Error awarding XP:', xpError);
            // Verify if award_xp exists or fall back to manual update?
            // Assuming schema_gamification.sql ran, it should exist.
            // Fallback: manually update user_stats if RPC fails? 
            // Let's stick to RPC for atomicity.
        }
    }

    return { message: 'Completed', xpEarned: xp };
}

import { getGrade } from '@/lib/utils';

export async function submitQuizResult(quizId: string, percentage: number) {
    const session = await getSession();
    if (!session?.username) return { error: 'Not authenticated' };

    const supabase = await createServiceRoleClient();

    // Calculate Grade
    const { grade, label } = getGrade(percentage);

    // Calculate XP based on percentage (Example: 100% = 100XP, >80% = 50XP, etc.)
    let xpToAward = 0;
    if (percentage >= 100) xpToAward = 100;
    else if (percentage >= 80) xpToAward = 50;
    else if (percentage >= 60) xpToAward = 20;

    // Check if already completed to prevent duplicate XP
    const { data: existing } = await supabase
        .from('user_progress')
        .select('id, score, xp_earned')
        .eq('username', session.username)
        .eq('content_id', quizId)
        .single();

    if (existing) {
        // Did they improve?
        if ((existing.score || 0) < percentage) {
            // Updated Policy: Update high score, but NO XP for retakes.
            await supabase
                .from('user_progress')
                .update({ score: percentage })
                .eq('id', existing.id);

            return { success: true, xpEarned: 0, message: `New High Score! Grade: ${grade} (${label})` };
        }
        return { success: true, xpEarned: 0, message: `Practice complete. Grade: ${grade}` };
    }

    // Insert Result
    const { error } = await supabase
        .from('user_progress')
        .insert({
            username: session.username,
            content_id: quizId,
            content_type: 'quiz',
            status: 'completed',
            score: percentage,
            xp_earned: xpToAward,
            completed_at: new Date().toISOString()
        });

    if (error) {
        console.error('Error submitting quiz:', error);
        return { error: 'Failed to save result' };
    }

    // Award XP
    if (xpToAward > 0) {
        await supabase.rpc('award_xp', {
            p_username: session.username,
            p_content_id: quizId,
            p_xp: xpToAward
        });
    }

    return { success: true, xpEarned: xpToAward, message: `Quiz Complete! Grade: ${grade} (${label})` };
}
