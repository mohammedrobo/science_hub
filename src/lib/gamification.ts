import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { unstable_cache } from 'next/cache';

// ============ LIGHTWEIGHT HEADER STATS (CACHED) ============

export interface HeaderStats {
    profilePictureUrl?: string;
    currentRank: string;
    totalXp: number;
    fullName?: string;
}

/**
 * Lightweight stats for the Header — 1 query instead of 3.
 * Cached per-user for 120 seconds so navigating between pages is instant.
 */
export async function getHeaderStats(username: string): Promise<HeaderStats> {
    return _getHeaderStatsCached(username);
}

const _getHeaderStatsCached = unstable_cache(
    async (username: string): Promise<HeaderStats> => {
        // Use service role client — unstable_cache cannot access cookies()
        const supabase = await createServiceRoleClient();

        const [statsResult, userResult] = await Promise.all([
            supabase
                .from('user_stats')
                .select('current_rank, total_xp, profile_picture_url')
                .eq('username', username)
                .single(),
            supabase
                .from('allowed_users')
                .select('full_name')
                .eq('username', username)
                .single(),
        ]);

        return {
            profilePictureUrl: statsResult.data?.profile_picture_url ?? undefined,
            currentRank: statsResult.data?.current_rank ?? 'E',
            totalXp: statsResult.data?.total_xp ?? 0,
            fullName: userResult.data?.full_name ?? undefined,
        };
    },
    ['header-stats'],
    { revalidate: 120, tags: ['header-stats'] }
);

// ============ FULL USER STATS ============

export interface UserStats {
    username: string;
    totalXp: number;
    currentRank: string;
    fullName?: string;
    profilePictureUrl?: string;
    completedCount?: number; // Total count (Legacy support)
    completedLessons: number;
    completedQuizzes: number;
    gpaS1: string; // Formatted GPA string
    gpaS2: string;
    cumulativeGPA: string;
}

export async function getUserStats(username: string): Promise<UserStats | null> {
    const supabase = await createClient();

    // Single combined query: fetch stats, progress, and user name in parallel
    const [statsResult, progressResult, userResult] = await Promise.all([
        supabase
            .from('user_stats')
            .select('username, total_xp, current_rank, profile_picture_url')
            .eq('username', username)
            .single(),
        supabase
            .from('user_progress')
            .select('content_id, content_type, score, status')
            .eq('username', username)
            .eq('status', 'completed'),
        supabase
            .from('allowed_users')
            .select('full_name')
            .eq('username', username)
            .single()
    ]);

    let stats = statsResult.data;
    const progress = progressResult.data;

    // Calculate Counts
    const completedLessons = progress?.filter(p => p.content_type === 'lesson').length || 0;
    const completedQuizzes = progress?.filter(p => p.content_type === 'quiz').length || 0;
    const totalCount = (progress?.length || 0);

    // 3. Calculate Predictive GPA
    // Logic: Map Percent -> GP -> Weighted Average

    let totalPointsS2 = 0;
    let totalCreditsS2 = 0;

    const quizProgress = progress?.filter(p => p.content_type === 'quiz' && typeof p.score === 'number') || [];

    quizProgress.forEach(p => {
        // All current content is considered Semester 2
        const score = p.score || 0;
        let gp = 0.0;

        if (score >= 95) gp = 4.0; // A+
        else if (score >= 90) gp = 4.0; // A
        else if (score >= 85) gp = 3.7; // A-
        else if (score >= 80) gp = 3.3; // B+
        else if (score >= 75) gp = 3.0; // B
        else if (score >= 70) gp = 2.7; // B-
        else if (score >= 65) gp = 2.3; // C+
        else if (score >= 60) gp = 2.0; // C
        else gp = 0.0; // F

        const credits = 3; // Standard weight
        totalPointsS2 += (gp * credits);
        totalCreditsS2 += credits;
    });

    const gpaS2 = totalCreditsS2 > 0 ? (totalPointsS2 / totalCreditsS2) : 0;

    // Feature Removal: We no longer include Term 1 GPA in the cumulative calculation.
    // The cumulative GPA is now effectively the Term 2 Prediction.
    const cumulativeGPA = gpaS2;

    // Format for display
    const formattedS1 = "0.00"; // Hardcoded as removed
    const formattedS2 = gpaS2 > 0 ? gpaS2.toFixed(2) : "0.00";
    const formattedCumulative = cumulativeGPA > 0 ? cumulativeGPA.toFixed(2) : "0.00";


    // If stats don't exist, create them
    if (statsResult.error || !stats) {
        const { data: newStats, error: createError } = await supabase
            .from('user_stats')
            .insert({
                username: username,
                total_xp: 0,
                current_rank: 'E'
            })
            .select('username, total_xp, current_rank, profile_picture_url')
            .single();

        if (!createError) {
            stats = newStats;
        } else {
            stats = {
                username,
                total_xp: 0,
                current_rank: 'E',
                profile_picture_url: undefined
            };
        }
    }

    return {
        username: stats?.username || username,
        totalXp: stats?.total_xp || 0,
        currentRank: stats?.current_rank || 'E',
        fullName: userResult.data?.full_name || username,
        profilePictureUrl: stats?.profile_picture_url,
        completedCount: totalCount,
        completedLessons,
        completedQuizzes,
        gpaS1: formattedS1,
        gpaS2: formattedS2,
        cumulativeGPA: formattedCumulative
    };
}

export interface CourseProgress {
    courseId: string;
    completedLessons: number;
    totalLessons: number;
    progressPercentage: number;
}

export async function getUserCourseProgress(
    username: string,
    courseId: string
): Promise<CourseProgress> {
    const supabase = await createClient();

    // Get all lessons for this course
    const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id')
        .eq('course_code', courseId);

    if (lessonsError || !lessons || lessons.length === 0) {
        return {
            courseId,
            completedLessons: 0,
            totalLessons: 0,
            progressPercentage: 0
        };
    }

    const totalLessons = lessons.length;
    const lessonIds = lessons.map(l => l.id);

    // Get completed lessons count
    const { count, error: progressError } = await supabase
        .from('user_progress')
        .select('content_id', { count: 'exact', head: true })
        .eq('username', username)
        .eq('status', 'completed')
        .in('content_id', lessonIds);

    if (progressError) {
        console.error('Error fetching progress:', progressError);
    }

    const completedLessons = count || 0;
    const progressPercentage = totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0;

    return {
        courseId,
        completedLessons,
        totalLessons,
        progressPercentage
    };
}

// ============ SUBJECT PERFORMANCE ANALYTICS ============

export interface SubjectPerformance {
    courseId: string;
    courseCode: string;
    courseName: string;
    quizzesCompleted: number;
    averageScore: number;
    bestScore: number;
    bestGrade: string;
}

import { getGrade } from '@/lib/utils';

/**
 * Get per-subject quiz performance breakdown for profile analytics
 */
export async function getSubjectPerformance(username: string): Promise<SubjectPerformance[]> {
    const supabase = await createClient();

    // Single query: fetch quiz progress with course info via JOIN
    const { data: progress } = await supabase
        .from('user_progress')
        .select('content_id, score, status')
        .eq('username', username)
        .eq('content_type', 'quiz')
        .eq('status', 'completed');

    if (!progress || progress.length === 0) {
        return [];
    }

    // Get quiz IDs and fetch their course associations in one query
    const quizIds = progress.map(p => p.content_id);

    const { data: quizzes } = await supabase
        .from('quizzes')
        .select(`
            id,
            course_id,
            course:courses(id, code, name)
        `)
        .in('id', quizIds);

    if (!quizzes) return [];

    // Build course -> quiz scores map
    const courseMap = new Map<string, {
        code: string;
        name: string;
        scores: number[]
    }>();

    quizzes.forEach(quiz => {
        const courseData = Array.isArray(quiz.course) ? quiz.course[0] : quiz.course;
        if (!courseData) return;

        const progressItem = progress.find(p => p.content_id === quiz.id);
        const score = progressItem?.score ?? 0;

        if (!courseMap.has(quiz.course_id)) {
            courseMap.set(quiz.course_id, {
                code: courseData.code,
                name: courseData.name,
                scores: []
            });
        }

        courseMap.get(quiz.course_id)!.scores.push(score);
    });

    // Convert to results array
    const results: SubjectPerformance[] = [];

    courseMap.forEach((data, courseId) => {
        const scores = data.scores;
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const bestScore = Math.max(...scores);
        const gradeInfo = getGrade(bestScore);

        results.push({
            courseId,
            courseCode: data.code,
            courseName: data.name,
            quizzesCompleted: scores.length,
            averageScore: Math.round(avgScore),
            bestScore,
            bestGrade: gradeInfo.grade
        });
    });

    // Sort by course code
    results.sort((a, b) => a.courseCode.localeCompare(b.courseCode));

    return results;
}

// ============ XP HISTORY FOR CHARTS ============

export interface XPHistoryPoint {
    date: string;
    xp: number;
}

/**
 * Get cumulative XP over time for a student's progress chart
 */
export async function getXPHistory(username: string): Promise<XPHistoryPoint[]> {
    const supabase = await createClient();

    const { data: progress } = await supabase
        .from('user_progress')
        .select('completed_at, xp_earned')
        .eq('username', username)
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: true });

    if (!progress || progress.length === 0) {
        return [];
    }

    // Group by date and accumulate XP
    const dailyXP = new Map<string, number>();
    let cumulativeXP = 0;

    for (const entry of progress) {
        const date = new Date(entry.completed_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
        const xpEarned = entry.xp_earned || 0;
        cumulativeXP += xpEarned;
        dailyXP.set(date, cumulativeXP);
    }

    return Array.from(dailyXP.entries()).map(([date, xp]) => ({ date, xp }));
}
