'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { readSession } from '@/lib/auth/session-read';

import { unstable_cache, updateTag } from 'next/cache';
import { examModeValue } from '@/lib/exam-mode';

const LESSONS_CACHE_SECONDS = examModeValue(1800, 3600); // 30m normal, 1h exam mode
const COURSE_PROGRESS_CACHE_SECONDS = examModeValue(1800, 3600); // 30m normal, 1h exam mode

// Cache lessons list — rarely changes, avoids re-fetching on every homepage visit
const getCachedLessons = unstable_cache(
    async () => {
        const supabase = await createServiceRoleClient();
        const { data } = await supabase
            .from('lessons')
            .select('id, course_code')
            .eq('is_published', true);
        return data ?? [];
    },
    ['all-lessons'],
    { revalidate: LESSONS_CACHE_SECONDS, tags: ['lessons'] }
);

const getCachedCompletedProgress = unstable_cache(
    async (username: string) => {
        const supabase = await createServiceRoleClient();
        const { data, error } = await supabase
            .from('user_progress')
            .select('content_id')
            .eq('username', username)
            .eq('status', 'completed');

        if (error) {
            console.error('Error fetching cached completed progress:', error);
            return [];
        }
        return data ?? [];
    },
    ['completed-progress'],
    { revalidate: COURSE_PROGRESS_CACHE_SECONDS, tags: ['course-progress'] }
);

export async function getCourseProgress(): Promise<Record<string, number>> {
    const session = await readSession();
    if (!session?.username) return {};

    // Parallel: fetch user progress + cached lessons list
    const [progressData, lessons] = await Promise.all([
        getCachedCompletedProgress(session.username),
        getCachedLessons(),
    ]);

    if (!lessons.length) return {};

    // Build course -> total lessons map and completed count
    const courseTotals = new Map<string, number>();
    const courseCompleted = new Map<string, number>();
    const completedIds = new Set(progressData.map(p => p.content_id));

    for (const lesson of lessons) {
        const code = lesson.course_code;
        courseTotals.set(code, (courseTotals.get(code) || 0) + 1);
        if (completedIds.has(lesson.id)) {
            courseCompleted.set(code, (courseCompleted.get(code) || 0) + 1);
        }
    }

    // Calculate percentage per course
    const courseProgress: Record<string, number> = {};
    for (const [code, total] of courseTotals) {
        const completed = courseCompleted.get(code) || 0;
        courseProgress[code] = total > 0 ? Math.round((completed / total) * 100) : 0;
    }

    return courseProgress;
}

export async function markContentAsCompleted(contentId: string, contentType: 'lesson' | 'quiz', xp: number = 0) {
    const session = await readSession();
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

    updateTag('course-progress');
    return { message: 'Completed', xpEarned: xp };
}

import { getGrade } from '@/lib/utils';

export async function submitQuizResult(quizId: string, percentage: number) {
    const session = await readSession();
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
            updateTag('course-progress');

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
            p_xp: xpToAward,
        });
    }

    updateTag('course-progress');

    // Revalidate shared leaderboard cache on XP changes.
    if (xpToAward > 0) {
        updateTag('leaderboard');
    }

    return { success: true, xpEarned: xpToAward, message: `Quiz Complete! Grade: ${grade} (${label})` };
}
