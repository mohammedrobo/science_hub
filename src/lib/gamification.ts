import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { unstable_cache } from 'next/cache';
import { examModeValue } from '@/lib/exam-mode';
import { getGrade } from '@/lib/utils';

const HEADER_STATS_REVALIDATE_SECONDS = examModeValue(900, 1800); // 15m normal, 30m exam
const USER_STATS_REVALIDATE_SECONDS = examModeValue(900, 1800); // 15m normal, 30m exam
const SUBJECT_PERFORMANCE_REVALIDATE_SECONDS = examModeValue(1800, 3600); // 30m normal, 1h exam
const XP_HISTORY_REVALIDATE_SECONDS = examModeValue(1800, 3600); // 30m normal, 1h exam
const COURSE_DETAIL_REVALIDATE_SECONDS = examModeValue(1800, 3600); // 30m normal, 1h exam
const QUIZ_SCORE_HISTORY_REVALIDATE_SECONDS = examModeValue(1800, 3600); // 30m normal, 1h exam
const OVERALL_COMPLETION_REVALIDATE_SECONDS = examModeValue(900, 1800); // 15m normal, 30m exam

// ============ LIGHTWEIGHT HEADER STATS (CACHED) ============

export interface HeaderStats {
    profilePictureUrl?: string;
    currentRank: string;
    totalXp: number;
    fullName?: string;
}

/**
 * Lightweight stats for the Header — 1 query instead of 3.
 * Cached per-user so navigating between pages is instant.
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
    ['header-stats-v2'],
    { revalidate: HEADER_STATS_REVALIDATE_SECONDS, tags: ['course-progress', 'leaderboard'] }
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
    return _getUserStatsCached(username);
}

const _getUserStatsCached = unstable_cache(
    async (username: string): Promise<UserStats | null> => {
        const supabase = await createServiceRoleClient();

        // Single combined query: fetch stats, progress, and user name in parallel
        const [statsResult, progressResult, userResult] = await Promise.all([
            supabase
                .from('user_stats')
                .select('username, total_xp, current_rank, profile_picture_url')
                .eq('username', username)
                .single(),
            supabase
                .from('user_progress')
                .select('content_type, score')
                .eq('username', username)
                .eq('status', 'completed'),
            supabase
                .from('allowed_users')
                .select('full_name')
                .eq('username', username)
                .single(),
        ]);

        let stats = statsResult.data;
        const progress = progressResult.data || [];

        let completedLessons = 0;
        let completedQuizzes = 0;
        let totalPointsS2 = 0;
        let totalCreditsS2 = 0;

        for (const item of progress) {
            if (item.content_type === 'lesson') {
                completedLessons++;
                continue;
            }

            if (item.content_type !== 'quiz') {
                continue;
            }

            completedQuizzes++;

            if (typeof item.score !== 'number') {
                continue;
            }

            // All current content is considered Semester 2.
            const score = item.score;
            let gp = 0.0;

            if (score >= 90) gp = 4.0;
            else if (score >= 85) gp = 3.7;
            else if (score >= 80) gp = 3.3;
            else if (score >= 75) gp = 3.0;
            else if (score >= 70) gp = 2.7;
            else if (score >= 65) gp = 2.3;
            else if (score >= 60) gp = 2.0;

            const credits = 3;
            totalPointsS2 += gp * credits;
            totalCreditsS2 += credits;
        }

        const totalCount = progress.length;
        const gpaS2 = totalCreditsS2 > 0 ? (totalPointsS2 / totalCreditsS2) : 0;

        const formattedS1 = '0.00'; // Term 1 removed from cumulative calculation.
        const formattedS2 = gpaS2 > 0 ? gpaS2.toFixed(2) : '0.00';
        const formattedCumulative = formattedS2;

        // If stats don't exist, create them.
        if (statsResult.error || !stats) {
            const { data: newStats, error: createError } = await supabase
                .from('user_stats')
                .insert({
                    username,
                    total_xp: 0,
                    current_rank: 'E',
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
                    profile_picture_url: undefined,
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
            cumulativeGPA: formattedCumulative,
        };
    },
    ['user-stats-v1'],
    { revalidate: USER_STATS_REVALIDATE_SECONDS, tags: ['course-progress', 'leaderboard'] }
);

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
            progressPercentage: 0,
        };
    }

    const totalLessons = lessons.length;
    const lessonIds = lessons.map((l) => l.id);

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
        progressPercentage,
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

/**
 * Get per-subject quiz performance breakdown for profile analytics.
 */
export async function getSubjectPerformance(username: string): Promise<SubjectPerformance[]> {
    return _getSubjectPerformanceCached(username);
}

const _getSubjectPerformanceCached = unstable_cache(
    async (username: string): Promise<SubjectPerformance[]> => {
        const supabase = await createServiceRoleClient();

        const { data: progress } = await supabase
            .from('user_progress')
            .select('content_id, score')
            .eq('username', username)
            .eq('content_type', 'quiz')
            .eq('status', 'completed');

        if (!progress || progress.length === 0) {
            return [];
        }

        const quizIds = progress.map((p) => p.content_id);
        const scoreByQuizId = new Map(progress.map((p) => [p.content_id, p.score ?? 0]));

        const { data: quizzes } = await supabase
            .from('quizzes')
            .select('id, course_id, course:courses(id, code, name)')
            .in('id', quizIds);

        if (!quizzes) {
            return [];
        }

        const courseMap = new Map<string, { code: string; name: string; scores: number[] }>();

        for (const quiz of quizzes) {
            const courseData = Array.isArray(quiz.course) ? quiz.course[0] : quiz.course;
            if (!courseData) {
                continue;
            }

            if (!courseMap.has(quiz.course_id)) {
                courseMap.set(quiz.course_id, {
                    code: courseData.code,
                    name: courseData.name,
                    scores: [],
                });
            }

            courseMap.get(quiz.course_id)!.scores.push(scoreByQuizId.get(quiz.id) ?? 0);
        }

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
                bestGrade: gradeInfo.grade,
            });
        });

        results.sort((a, b) => a.courseCode.localeCompare(b.courseCode));
        return results;
    },
    ['subject-performance-v1'],
    { revalidate: SUBJECT_PERFORMANCE_REVALIDATE_SECONDS, tags: ['course-progress'] }
);

// ============ XP HISTORY FOR CHARTS ============

export interface XPHistoryPoint {
    date: string;
    xp: number;
}

/**
 * Get cumulative XP over time for a student's progress chart.
 */
export async function getXPHistory(username: string): Promise<XPHistoryPoint[]> {
    return _getXPHistoryCached(username);
}

const _getXPHistoryCached = unstable_cache(
    async (username: string): Promise<XPHistoryPoint[]> => {
        const supabase = await createServiceRoleClient();

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

        // Group by date and accumulate XP.
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
    },
    ['xp-history-v1'],
    { revalidate: XP_HISTORY_REVALIDATE_SECONDS, tags: ['course-progress', 'leaderboard'] }
);

// ============ DETAILED COURSE PROGRESS ============

export interface LessonDetail {
    lessonId: string;
    title: string;
    orderIndex: number;
    isCompleted: boolean;
    completedAt: string | null;
}

export interface QuizDetail {
    quizId: string;
    title: string;
    score: number | null;
    grade: string;
    completedAt: string | null;
}

export interface CourseDetailedProgress {
    courseId: string;
    courseCode: string;
    courseName: string;
    lessons: LessonDetail[];
    quizzes: QuizDetail[];
    completedLessons: number;
    totalLessons: number;
    completedQuizzes: number;
    totalQuizzes: number;
    lessonCompletionPercent: number;
    quizCompletionPercent: number;
    overallPercent: number;
}

type CourseLite = {
    id: string;
    code: string;
    name: string;
};

type LessonLite = {
    id: string;
    course_id: string;
    title: string;
    order_index: number;
};

type QuizLite = {
    id: string;
    course_id: string;
    title: string;
};

type ProgressLite = {
    content_id: string;
    score: number | null;
    completed_at: string | null;
};

function buildCourseDetailedProgressMap(
    courses: CourseLite[],
    lessons: LessonLite[],
    quizzes: QuizLite[],
    progress: ProgressLite[]
): Record<string, CourseDetailedProgress> {
    const lessonsByCourse = new Map<string, LessonLite[]>();
    const quizzesByCourse = new Map<string, QuizLite[]>();
    const progressMap = new Map(progress.map((p) => [p.content_id, p]));

    for (const lesson of lessons) {
        if (!lessonsByCourse.has(lesson.course_id)) {
            lessonsByCourse.set(lesson.course_id, []);
        }
        lessonsByCourse.get(lesson.course_id)!.push(lesson);
    }

    for (const quiz of quizzes) {
        if (!quizzesByCourse.has(quiz.course_id)) {
            quizzesByCourse.set(quiz.course_id, []);
        }
        quizzesByCourse.get(quiz.course_id)!.push(quiz);
    }

    const result: Record<string, CourseDetailedProgress> = {};

    for (const course of courses) {
        const courseLessons = (lessonsByCourse.get(course.id) || []).sort((a, b) => a.order_index - b.order_index);
        const courseQuizzes = quizzesByCourse.get(course.id) || [];

        const lessonDetails: LessonDetail[] = courseLessons.map((lesson) => {
            const entry = progressMap.get(lesson.id);
            return {
                lessonId: lesson.id,
                title: lesson.title,
                orderIndex: lesson.order_index,
                isCompleted: !!entry,
                completedAt: entry?.completed_at ?? null,
            };
        });

        const quizDetails: QuizDetail[] = courseQuizzes.map((quiz) => {
            const entry = progressMap.get(quiz.id);
            return {
                quizId: quiz.id,
                title: quiz.title,
                score: entry?.score ?? null,
                grade: entry ? getGrade(entry.score ?? 0).grade : '-',
                completedAt: entry?.completed_at ?? null,
            };
        });

        const completedLessons = lessonDetails.filter((l) => l.isCompleted).length;
        const completedQuizzes = quizDetails.filter((q) => q.score !== null).length;
        const totalLessons = lessonDetails.length;
        const totalQuizzes = quizDetails.length;
        const totalItems = totalLessons + totalQuizzes;

        result[course.id] = {
            courseId: course.id,
            courseCode: course.code,
            courseName: course.name,
            lessons: lessonDetails,
            quizzes: quizDetails,
            completedLessons,
            totalLessons,
            completedQuizzes,
            totalQuizzes,
            lessonCompletionPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
            quizCompletionPercent: totalQuizzes > 0 ? Math.round((completedQuizzes / totalQuizzes) * 100) : 0,
            overallPercent: totalItems > 0 ? Math.round(((completedLessons + completedQuizzes) / totalItems) * 100) : 0,
        };
    }

    return result;
}

const _getCoursesDetailedProgressCached = unstable_cache(
    async (username: string, sortedCourseIds: string[]): Promise<Record<string, CourseDetailedProgress>> => {
        if (sortedCourseIds.length === 0) {
            return {};
        }

        const supabase = await createServiceRoleClient();

        const [coursesResult, lessonsResult, quizzesResult] = await Promise.all([
            supabase
                .from('courses')
                .select('id, code, name')
                .in('id', sortedCourseIds),
            supabase
                .from('lessons')
                .select('id, course_id, title, order_index')
                .in('course_id', sortedCourseIds)
                .order('order_index', { ascending: true }),
            supabase
                .from('quizzes')
                .select('id, course_id, title')
                .in('course_id', sortedCourseIds),
        ]);

        const courses = coursesResult.data || [];
        const lessons = lessonsResult.data || [];
        const quizzes = quizzesResult.data || [];

        const contentIds = [...lessons.map((l) => l.id), ...quizzes.map((q) => q.id)];

        let progress: ProgressLite[] = [];
        if (contentIds.length > 0) {
            const { data: progressData } = await supabase
                .from('user_progress')
                .select('content_id, score, completed_at')
                .eq('username', username)
                .eq('status', 'completed')
                .in('content_id', contentIds);

            progress = progressData || [];
        }

        return buildCourseDetailedProgressMap(courses, lessons, quizzes, progress);
    },
    ['course-detailed-progress-batch-v1'],
    { revalidate: COURSE_DETAIL_REVALIDATE_SECONDS, tags: ['course-progress', 'lessons'] }
);

/**
 * Get per-lesson and per-quiz completion detail for a single course.
 */
export async function getCourseDetailedProgress(
    username: string,
    courseId: string
): Promise<CourseDetailedProgress | null> {
    const map = await getCoursesDetailedProgress(username, [courseId]);
    return map[courseId] || null;
}

/**
 * Batch version used by /progress to avoid one DB roundtrip per course.
 */
export async function getCoursesDetailedProgress(
    username: string,
    courseIds: string[]
): Promise<Record<string, CourseDetailedProgress>> {
    const sortedCourseIds = [...new Set(courseIds.filter(Boolean))].sort();
    if (sortedCourseIds.length === 0) {
        return {};
    }
    return _getCoursesDetailedProgressCached(username, sortedCourseIds);
}

// ============ QUIZ SCORE HISTORY (TIME-SERIES) ============

export interface QuizScorePoint {
    date: string;
    score: number;
    quizTitle: string;
    courseCode: string;
}

/**
 * Get timestamped quiz scores for trend charting.
 * If courseId is provided, filter to that course only.
 */
export async function getQuizScoreHistory(
    username: string,
    courseId?: string
): Promise<QuizScorePoint[]> {
    return _getQuizScoreHistoryCached(username, courseId || '__all__');
}

const _getQuizScoreHistoryCached = unstable_cache(
    async (username: string, courseIdOrAll: string): Promise<QuizScorePoint[]> => {
        const supabase = await createServiceRoleClient();
        const courseId = courseIdOrAll === '__all__' ? undefined : courseIdOrAll;

        // Get all completed quizzes with scores
        const { data: progress } = await supabase
            .from('user_progress')
            .select('content_id, score, completed_at')
            .eq('username', username)
            .eq('content_type', 'quiz')
            .eq('status', 'completed')
            .not('completed_at', 'is', null)
            .not('score', 'is', null)
            .order('completed_at', { ascending: true });

        if (!progress || progress.length === 0) {
            return [];
        }

        const quizIds = progress.map((p) => p.content_id);

        // Fetch quiz + course info
        let quizQuery = supabase
            .from('quizzes')
            .select('id, title, course_id, course:courses(id, code, name)')
            .in('id', quizIds);

        if (courseId) {
            quizQuery = quizQuery.eq('course_id', courseId);
        }

        const { data: quizzes } = await quizQuery;
        if (!quizzes) {
            return [];
        }

        const quizMap = new Map(
            quizzes.map((q) => {
                const courseData = Array.isArray(q.course) ? q.course[0] : q.course;
                return [q.id, { title: q.title, courseCode: courseData?.code ?? '???' }];
            })
        );

        return progress
            .filter((p) => quizMap.has(p.content_id))
            .map((p) => {
                const quiz = quizMap.get(p.content_id)!;
                return {
                    date: new Date(p.completed_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                    }),
                    score: p.score ?? 0,
                    quizTitle: quiz.title,
                    courseCode: quiz.courseCode,
                };
            });
    },
    ['quiz-score-history-v1'],
    { revalidate: QUIZ_SCORE_HISTORY_REVALIDATE_SECONDS, tags: ['course-progress'] }
);

// ============ OVERALL COMPLETION STATS ============

export interface OverallCompletion {
    totalLessons: number;
    completedLessons: number;
    totalQuizzes: number;
    completedQuizzes: number;
    overallPercent: number;
    coursesWithProgress: {
        courseId: string;
        courseCode: string;
        courseName: string;
        completedLessons: number;
        totalLessons: number;
        completedQuizzes: number;
        totalQuizzes: number;
        percent: number;
    }[];
}

export async function getOverallCompletion(username: string): Promise<OverallCompletion> {
    return _getOverallCompletionCached(username);
}

const _getOverallCompletionCached = unstable_cache(
    async (username: string): Promise<OverallCompletion> => {
        const supabase = await createServiceRoleClient();

        const [coursesResult, lessonsResult, quizzesResult, progressResult] = await Promise.all([
            supabase.from('courses').select('id, code, name'),
            supabase.from('lessons').select('id, course_id'),
            supabase.from('quizzes').select('id, course_id'),
            supabase
                .from('user_progress')
                .select('content_id')
                .eq('username', username)
                .eq('status', 'completed'),
        ]);

        const courses = coursesResult.data || [];
        const lessons = lessonsResult.data || [];
        const quizzes = quizzesResult.data || [];
        const progress = progressResult.data || [];

        const completedIds = new Set(progress.map((p) => p.content_id));

        const lessonTotalsByCourse = new Map<string, number>();
        const quizTotalsByCourse = new Map<string, number>();
        const completedLessonsByCourse = new Map<string, number>();
        const completedQuizzesByCourse = new Map<string, number>();

        for (const lesson of lessons) {
            lessonTotalsByCourse.set(lesson.course_id, (lessonTotalsByCourse.get(lesson.course_id) || 0) + 1);
            if (completedIds.has(lesson.id)) {
                completedLessonsByCourse.set(
                    lesson.course_id,
                    (completedLessonsByCourse.get(lesson.course_id) || 0) + 1
                );
            }
        }

        for (const quiz of quizzes) {
            quizTotalsByCourse.set(quiz.course_id, (quizTotalsByCourse.get(quiz.course_id) || 0) + 1);
            if (completedIds.has(quiz.id)) {
                completedQuizzesByCourse.set(
                    quiz.course_id,
                    (completedQuizzesByCourse.get(quiz.course_id) || 0) + 1
                );
            }
        }

        const coursesWithProgress = courses
            .map((course) => {
                const totalLessons = lessonTotalsByCourse.get(course.id) || 0;
                const totalQuizzes = quizTotalsByCourse.get(course.id) || 0;
                const completedLessons = completedLessonsByCourse.get(course.id) || 0;
                const completedQuizzes = completedQuizzesByCourse.get(course.id) || 0;
                const totalItems = totalLessons + totalQuizzes;

                return {
                    courseId: course.id,
                    courseCode: course.code,
                    courseName: course.name,
                    completedLessons,
                    totalLessons,
                    completedQuizzes,
                    totalQuizzes,
                    percent: totalItems > 0
                        ? Math.round(((completedLessons + completedQuizzes) / totalItems) * 100)
                        : 0,
                };
            })
            .filter((course) => course.totalLessons > 0 || course.totalQuizzes > 0)
            .sort((a, b) => a.courseCode.localeCompare(b.courseCode));

        const totalLessons = lessons.length;
        const totalQuizzes = quizzes.length;
        const completedLessons = lessons.reduce((count, lesson) => count + (completedIds.has(lesson.id) ? 1 : 0), 0);
        const completedQuizzes = quizzes.reduce((count, quiz) => count + (completedIds.has(quiz.id) ? 1 : 0), 0);
        const totalItems = totalLessons + totalQuizzes;

        return {
            totalLessons,
            completedLessons,
            totalQuizzes,
            completedQuizzes,
            overallPercent: totalItems > 0
                ? Math.round(((completedLessons + completedQuizzes) / totalItems) * 100)
                : 0,
            coursesWithProgress,
        };
    },
    ['overall-completion-v1'],
    { revalidate: OVERALL_COMPLETION_REVALIDATE_SECONDS, tags: ['course-progress', 'lessons'] }
);
