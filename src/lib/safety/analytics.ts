import { createServiceRoleClient } from '@/lib/supabase/server';

// ═══════════════════════════════════════════════════════════════
// Safety Analytics Engine — Compute engagement scores, detect
// anomalies, generate heatmaps, and provide class-wide insights
// ═══════════════════════════════════════════════════════════════

export interface EngagementScore {
    username: string;
    fullName: string | null;
    section: string | null;
    group: string | null;
    role: string;
    score: number;           // 0–100
    level: 'excellent' | 'good' | 'average' | 'low' | 'critical';
    metrics: {
        loginFrequency: number;      // days active in last 30 / 30
        quizParticipation: number;   // quizzes in last 30 days
        lessonEngagement: number;    // lessons viewed in last 30 days
        sessionDuration: number;     // avg minutes per session
        pageViewDiversity: number;   // unique pages visited
        consistencyStreak: number;   // consecutive days with activity
    };
    lastActive: string | null;
    totalXp: number;
    rank: string;
    riskScore: number;
    reportCount: number;
    // Academic data
    quizzesTaken: number;
    averageQuizScore: number;
    lessonsCompleted: number;
    totalProgress: number;
    // Per-course academic breakdown
    courseScores: {
        courseCode: string;
        courseName: string;
        quizCount: number;
        avgScore: number;
        bestScore: number;
        lessonsCompleted: number;
    }[];
}

export interface HeatmapCell {
    day: number;   // 0=Sun, 6=Sat
    hour: number;  // 0-23
    count: number;
}

export interface ClassOverview {
    totalStudents: number;
    activeToday: number;
    activeThisWeek: number;
    avgEngagementScore: number;
    topPerformers: { username: string; score: number }[];
    atRiskStudents: { username: string; score: number; reason: string }[];
    sectionBreakdown: { section: string; avgScore: number; studentCount: number; avgQuizScore: number; lessonsCompleted: number }[];
    groupBreakdown: { group: string; avgScore: number; studentCount: number; avgQuizScore: number; lessonsCompleted: number }[];
    // Academic overview
    totalQuizzesTaken: number;
    avgQuizScore: number;
    totalLessonsCompleted: number;
    topQuizScorers: { username: string; avgScore: number; quizCount: number }[];
    gradeDistribution: { A: number; B: number; C: number; D: number; F: number };
    // Per-course class-wide breakdown
    courseBreakdown: {
        courseCode: string;
        courseName: string;
        avgScore: number;
        studentsTaken: number;
        totalQuizzes: number;
        bestAvgStudent: string;
    }[];
}

// ──────────────────────────────────────────
// Shared Scoring Logic (DRY — used by both
// single and batch engagement computation)
// ──────────────────────────────────────────

interface ActivityLog {
    action_type: string;
    created_at: string;
    details?: any;
}

interface ScoreInput {
    activities: ActivityLog[];
    reportCount: number;
}

interface ScoreOutput {
    score: number;
    level: EngagementScore['level'];
    riskScore: number;
    metrics: EngagementScore['metrics'];
}

function computeScoreFromActivities(input: ScoreInput): ScoreOutput {
    const { activities, reportCount } = input;

    // Compute individual metrics
    const uniqueDays = new Set(activities.map(a => a.created_at.split('T')[0]));
    const loginFrequency = uniqueDays.size / 30;

    const quizzes = activities.filter(a => a.action_type === 'QUIZ_SUBMIT').length;
    const lessons = activities.filter(a => a.action_type === 'LESSON_VIEW').length;
    const failedLogins = activities.filter(a => a.action_type === 'LOGIN_FAILED').length;

    // Page view diversity
    const uniquePages = new Set(
        activities
            .filter(a => a.action_type === 'PAGE_VIEW' && a.details?.path)
            .map(a => a.details.path)
    );

    // Session duration (estimate: group by day, diff between first/last action)
    let totalSessionMinutes = 0;
    let sessionCount = 0;
    for (const day of uniqueDays) {
        const dayLogs = activities.filter(a => a.created_at.startsWith(day));
        if (dayLogs.length >= 2) {
            const first = new Date(dayLogs[dayLogs.length - 1].created_at).getTime();
            const last = new Date(dayLogs[0].created_at).getTime();
            totalSessionMinutes += (last - first) / 60000;
            sessionCount++;
        }
    }
    const avgSessionMinutes = sessionCount > 0 ? totalSessionMinutes / sessionCount : 0;

    // Consistency streak (consecutive days ending today or yesterday)
    const sortedDays = [...uniqueDays].sort().reverse();
    let streak = 0;
    const checkDate = new Date();
    for (let i = 0; i < 30; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (sortedDays.includes(dateStr)) {
            streak++;
        } else if (i > 0) {
            break; // streak broken
        }
        checkDate.setDate(checkDate.getDate() - 1);
    }

    const metrics: EngagementScore['metrics'] = {
        loginFrequency: Math.round(loginFrequency * 100),
        quizParticipation: quizzes,
        lessonEngagement: lessons,
        sessionDuration: Math.round(avgSessionMinutes),
        pageViewDiversity: uniquePages.size,
        consistencyStreak: streak,
    };

    // Compute weighted score (0-100)
    let score = 0;
    score += Math.min(loginFrequency * 30, 25);           // 25% — login frequency
    score += Math.min(quizzes * 5, 20);                    // 20% — quiz participation
    score += Math.min(lessons * 2, 15);                    // 15% — lesson views
    score += Math.min(avgSessionMinutes * 0.5, 15);        // 15% — session duration
    score += Math.min(uniquePages.size * 1.5, 10);         // 10% — page diversity
    score += Math.min(streak * 2, 15);                     // 15% — consistency
    score = Math.round(Math.min(score, 100));

    // Risk score (higher = more concerning)
    let riskScore = reportCount * 20 + failedLogins * 5;
    if (loginFrequency < 0.1) riskScore += 15;
    riskScore = Math.min(riskScore, 100);

    const level: EngagementScore['level'] =
        score >= 80 ? 'excellent' :
        score >= 60 ? 'good' :
        score >= 40 ? 'average' :
        score >= 20 ? 'low' : 'critical';

    return { score, level, riskScore, metrics };
}

// ──────────────────────────────────────────
// Engagement Score Computation
// ──────────────────────────────────────────

export async function computeEngagementScore(username: string): Promise<EngagementScore | null> {
    const supabase = await createServiceRoleClient();

    // Fetch user info
    const { data: user } = await supabase
        .from('allowed_users')
        .select('username, full_name, original_section, original_group, last_login_at, created_at, access_role')
        .eq('username', username)
        .single();

    if (!user) return null;

    // Fetch XP + rank
    const { data: stats } = await supabase
        .from('user_stats')
        .select('total_xp, current_rank, quizzes_taken')
        .eq('username', username)
        .single();

    // Fetch activity logs (last 30 days, capped at 2000 rows)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [logsRes, reportCountRes, progressRes] = await Promise.all([
        supabase
            .from('activity_logs')
            .select('action_type, created_at, details')
            .eq('username', username)
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(2000),
        supabase
            .from('student_reports')
            .select('*', { count: 'exact', head: true })
            .eq('reported_username', username),
        supabase
            .from('user_progress')
            .select('content_id, content_type, status, score')
            .eq('username', username),
    ]);

    const activities = logsRes.data || [];
    const reportCount = reportCountRes.count || 0;
    const progress = progressRes.data || [];

    const quizzes = progress.filter(p => p.content_type === 'quiz' && p.score != null);
    const lessonsCompleted = progress.filter(p => p.content_type === 'lesson' && p.status === 'completed').length;

    // Per-course breakdown for this student
    const { data: quizMeta } = await supabase.from('quizzes').select('id, course_id');
    const { data: courses } = await supabase.from('courses').select('id, code, name');
    const { data: lessonMeta } = await supabase.from('lessons').select('id, course_id');
    const cMap = new Map((courses || []).map(c => [c.id, { code: c.code, name: c.name }]));
    const qToCourse = new Map((quizMeta || []).filter(q => q.course_id && cMap.has(q.course_id)).map(q => [q.id, q.course_id]));
    const lToCourse = new Map((lessonMeta || []).filter(l => l.course_id).map(l => [l.id, l.course_id]));

    const courseBucket = new Map<string, { totalScore: number; count: number; bestScore: number; lessons: number }>();
    for (const p of progress) {
        let courseId: string | undefined;
        if (p.content_type === 'quiz' && p.score != null) {
            courseId = qToCourse.get(p.content_id);
        } else if (p.content_type === 'lesson' && p.status === 'completed') {
            courseId = lToCourse.get(p.content_id);
        }
        if (courseId) {
            const ex = courseBucket.get(courseId) || { totalScore: 0, count: 0, bestScore: 0, lessons: 0 };
            if (p.content_type === 'quiz' && p.score != null) { ex.totalScore += p.score; ex.count++; ex.bestScore = Math.max(ex.bestScore, p.score); }
            if (p.content_type === 'lesson' && p.status === 'completed') ex.lessons++;
            courseBucket.set(courseId, ex);
        }
    }
    const courseScores: EngagementScore['courseScores'] = [...courseBucket.entries()]
        .map(([cid, d]) => {
            const ci = cMap.get(cid);
            return ci ? { courseCode: ci.code, courseName: ci.name, quizCount: d.count, avgScore: d.count > 0 ? Math.round(d.totalScore / d.count) : 0, bestScore: d.bestScore, lessonsCompleted: d.lessons } : null;
        })
        .filter(Boolean) as EngagementScore['courseScores'];
    courseScores.sort((a, b) => a.courseCode.localeCompare(b.courseCode));

    const { score, level, riskScore, metrics } = computeScoreFromActivities({
        activities,
        reportCount,
    });

    return {
        username: user.username,
        fullName: user.full_name,
        section: user.original_section,
        group: user.original_group,
        role: (user as any).access_role || 'student',
        score,
        level,
        metrics,
        lastActive: user.last_login_at,
        totalXp: stats?.total_xp || 0,
        rank: stats?.current_rank || 'E',
        riskScore,
        reportCount,
        quizzesTaken: quizzes.length,
        averageQuizScore: quizzes.length > 0 ? Math.round(quizzes.reduce((s, q) => s + (q.score || 0), 0) / quizzes.length) : 0,
        lessonsCompleted,
        totalProgress: progress.length,
        courseScores,
    };
}

// ──────────────────────────────────────────
// Batch: All Students Engagement
// ──────────────────────────────────────────

export async function getAllStudentEngagement(filters?: {
    section?: string;
    group?: string;
    username?: string;
}): Promise<EngagementScore[]> {
    const supabase = await createServiceRoleClient();

    // Get all students
    let query = supabase
        .from('allowed_users')
        .select('username, full_name, original_section, original_group, last_login_at, created_at, access_role')
        .order('username');

    if (filters?.section) query = query.eq('original_section', filters.section);
    if (filters?.group) query = query.eq('original_group', filters.group);
    if (filters?.username) query = query.ilike('username', `%${filters.username}%`);

    const { data: students } = await query;
    if (!students || students.length === 0) return [];

    // Batch fetch: all activity logs for last 30 days (capped at 10000 rows)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: allLogs } = await supabase
        .from('activity_logs')
        .select('username, action_type, created_at, details')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10000);

    // Batch fetch: all XP + ranks
    const { data: allStats } = await supabase
        .from('user_stats')
        .select('username, total_xp, current_rank, quizzes_taken');

    // Batch fetch: report counts
    const { data: allReports } = await supabase
        .from('student_reports')
        .select('reported_username');

    // Batch fetch: all user_progress (quiz scores + lesson completions)
    const { data: allProgress } = await supabase
        .from('user_progress')
        .select('username, content_id, content_type, status, score');

    // Batch fetch: quizzes → courses mapping (for per-course breakdown)
    const { data: allQuizzes } = await supabase
        .from('quizzes')
        .select('id, course_id, title');

    const { data: allCourses } = await supabase
        .from('courses')
        .select('id, code, name');

    // Build quiz→course lookup
    const courseMap = new Map<string, { code: string; name: string }>();
    for (const c of (allCourses || [])) {
        courseMap.set(c.id, { code: c.code, name: c.name });
    }
    const quizToCourse = new Map<string, { courseId: string; code: string; name: string }>();
    for (const q of (allQuizzes || [])) {
        if (q.course_id && courseMap.has(q.course_id)) {
            const c = courseMap.get(q.course_id)!;
            quizToCourse.set(q.id, { courseId: q.course_id, code: c.code, name: c.name });
        }
    }

    // Build lesson→course lookup from lessons table (content_id can be lesson id too)
    const { data: allLessons } = await supabase
        .from('lessons')
        .select('id, course_id');
    const lessonToCourse = new Map<string, string>();
    for (const l of (allLessons || [])) {
        if (l.course_id) lessonToCourse.set(l.id, l.course_id);
    }

    // Group data by username
    const logsByUser = new Map<string, typeof allLogs>();
    for (const log of (allLogs || [])) {
        if (!logsByUser.has(log.username)) logsByUser.set(log.username, []);
        logsByUser.get(log.username)!.push(log);
    }

    const xpByUser = new Map<string, number>();
    const rankByUser = new Map<string, string>();
    for (const s of (allStats || [])) {
        xpByUser.set(s.username, s.total_xp || 0);
        rankByUser.set(s.username, s.current_rank || 'E');
    }

    const reportsByUser = new Map<string, number>();
    for (const r of (allReports || [])) {
        reportsByUser.set(r.reported_username, (reportsByUser.get(r.reported_username) || 0) + 1);
    }

    // Group academic progress by username
    const quizByUser = new Map<string, { count: number; totalScore: number }>();
    const lessonByUser = new Map<string, number>();
    const progressByUser = new Map<string, number>();
    // Per-course per-user breakdown
    const courseScoresByUser = new Map<string, Map<string, { totalScore: number; count: number; bestScore: number; lessonsCompleted: number }>>();
    for (const p of (allProgress || [])) {
        // Total progress entries
        progressByUser.set(p.username, (progressByUser.get(p.username) || 0) + 1);
        if (p.content_type === 'quiz' && p.score != null) {
            const existing = quizByUser.get(p.username) || { count: 0, totalScore: 0 };
            existing.count++;
            existing.totalScore += p.score;
            quizByUser.set(p.username, existing);

            // Per-course quiz score
            const courseInfo = quizToCourse.get(p.content_id);
            if (courseInfo) {
                if (!courseScoresByUser.has(p.username)) courseScoresByUser.set(p.username, new Map());
                const userCourses = courseScoresByUser.get(p.username)!;
                const existing = userCourses.get(courseInfo.courseId) || { totalScore: 0, count: 0, bestScore: 0, lessonsCompleted: 0 };
                existing.totalScore += p.score;
                existing.count++;
                existing.bestScore = Math.max(existing.bestScore, p.score);
                userCourses.set(courseInfo.courseId, existing);
            }
        }
        if (p.content_type === 'lesson' && p.status === 'completed') {
            lessonByUser.set(p.username, (lessonByUser.get(p.username) || 0) + 1);

            // Per-course lesson completion
            const courseId = lessonToCourse.get(p.content_id);
            if (courseId) {
                if (!courseScoresByUser.has(p.username)) courseScoresByUser.set(p.username, new Map());
                const userCourses = courseScoresByUser.get(p.username)!;
                const existing = userCourses.get(courseId) || { totalScore: 0, count: 0, bestScore: 0, lessonsCompleted: 0 };
                existing.lessonsCompleted++;
                userCourses.set(courseId, existing);
            }
        }
    }

    // Compute scores for each student using shared scoring logic
    const results: EngagementScore[] = [];

    for (const student of students) {
        const activities = logsByUser.get(student.username) || [];
        const reportCount = reportsByUser.get(student.username) || 0;

        const { score, level, riskScore, metrics } = computeScoreFromActivities({
            activities,
            reportCount,
        });

        const quizData = quizByUser.get(student.username);

        // Build per-course scores for this student
        const userCourseMap = courseScoresByUser.get(student.username);
        const courseScores: EngagementScore['courseScores'] = [];
        if (userCourseMap) {
            for (const [courseId, data] of userCourseMap) {
                const courseInfo = courseMap.get(courseId);
                if (courseInfo) {
                    courseScores.push({
                        courseCode: courseInfo.code,
                        courseName: courseInfo.name,
                        quizCount: data.count,
                        avgScore: data.count > 0 ? Math.round(data.totalScore / data.count) : 0,
                        bestScore: data.bestScore,
                        lessonsCompleted: data.lessonsCompleted,
                    });
                }
            }
            courseScores.sort((a, b) => a.courseCode.localeCompare(b.courseCode));
        }

        results.push({
            username: student.username,
            fullName: student.full_name,
            section: student.original_section,
            group: student.original_group,
            role: (student as any).access_role || 'student',
            score,
            level,
            metrics,
            lastActive: student.last_login_at,
            totalXp: xpByUser.get(student.username) || 0,
            rank: rankByUser.get(student.username) || 'E',
            riskScore,
            reportCount,
            quizzesTaken: quizData?.count || 0,
            averageQuizScore: quizData ? Math.round(quizData.totalScore / quizData.count) : 0,
            lessonsCompleted: lessonByUser.get(student.username) || 0,
            totalProgress: progressByUser.get(student.username) || 0,
            courseScores,
        });
    }

    return results;
}

// ──────────────────────────────────────────
// Activity Heatmap
// ──────────────────────────────────────────

export async function getActivityHeatmap(username?: string): Promise<HeatmapCell[]> {
    const supabase = await createServiceRoleClient();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let query = supabase
        .from('activity_logs')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .limit(5000);

    if (username) {
        query = query.eq('username', username);
    }

    const { data: logs } = await query;

    // Build 7×24 heatmap
    const grid = new Map<string, number>();
    for (const log of (logs || [])) {
        const d = new Date(log.created_at);
        const key = `${d.getDay()}-${d.getHours()}`;
        grid.set(key, (grid.get(key) || 0) + 1);
    }

    const cells: HeatmapCell[] = [];
    for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
            cells.push({
                day,
                hour,
                count: grid.get(`${day}-${hour}`) || 0,
            });
        }
    }

    return cells;
}

// ──────────────────────────────────────────
// Class Overview
// ──────────────────────────────────────────

export async function getClassOverview(preloadedStudents?: EngagementScore[]): Promise<ClassOverview> {
    const allStudents = preloadedStudents ?? await getAllStudentEngagement();

    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const activeToday = allStudents.filter(s =>
        s.lastActive && s.lastActive.startsWith(today)
    ).length;

    const activeThisWeek = allStudents.filter(s =>
        s.lastActive && new Date(s.lastActive) >= weekAgo
    ).length;

    const avgScore = allStudents.length > 0
        ? Math.round(allStudents.reduce((sum, s) => sum + s.score, 0) / allStudents.length)
        : 0;

    const sorted = [...allStudents].sort((a, b) => b.score - a.score);
    const topPerformers = sorted.slice(0, 5).map(s => ({ username: s.username, score: s.score }));

    const atRisk = allStudents
        .filter(s => s.score < 20 || s.riskScore > 30)
        .sort((a, b) => a.score - b.score)
        .slice(0, 10)
        .map(s => ({
            username: s.username,
            score: s.score,
            reason: s.riskScore > 30 ? 'High risk score' :
                    s.score === 0 ? 'No activity' :
                    'Very low engagement'
        }));

    // Section breakdown (with academic data)
    const sectionMap = new Map<string, { total: number; count: number; quizScoreSum: number; quizCount: number; lessons: number }>();
    for (const s of allStudents) {
        const sec = s.section || 'Unknown';
        const existing = sectionMap.get(sec) || { total: 0, count: 0, quizScoreSum: 0, quizCount: 0, lessons: 0 };
        existing.total += s.score;
        existing.count++;
        if (s.quizzesTaken > 0) {
            existing.quizScoreSum += s.averageQuizScore * s.quizzesTaken;
            existing.quizCount += s.quizzesTaken;
        }
        existing.lessons += s.lessonsCompleted;
        sectionMap.set(sec, existing);
    }
    const sectionBreakdown = [...sectionMap.entries()]
        .map(([section, d]) => ({
            section,
            avgScore: Math.round(d.total / d.count),
            studentCount: d.count,
            avgQuizScore: d.quizCount > 0 ? Math.round(d.quizScoreSum / d.quizCount) : 0,
            lessonsCompleted: d.lessons,
        }))
        .sort((a, b) => a.section.localeCompare(b.section));

    // Group breakdown (with academic data)
    const groupMap = new Map<string, { total: number; count: number; quizScoreSum: number; quizCount: number; lessons: number }>();
    for (const s of allStudents) {
        const grp = s.group || 'Unknown';
        const existing = groupMap.get(grp) || { total: 0, count: 0, quizScoreSum: 0, quizCount: 0, lessons: 0 };
        existing.total += s.score;
        existing.count++;
        if (s.quizzesTaken > 0) {
            existing.quizScoreSum += s.averageQuizScore * s.quizzesTaken;
            existing.quizCount += s.quizzesTaken;
        }
        existing.lessons += s.lessonsCompleted;
        groupMap.set(grp, existing);
    }
    const groupBreakdown = [...groupMap.entries()]
        .map(([group, d]) => ({
            group,
            avgScore: Math.round(d.total / d.count),
            studentCount: d.count,
            avgQuizScore: d.quizCount > 0 ? Math.round(d.quizScoreSum / d.quizCount) : 0,
            lessonsCompleted: d.lessons,
        }))
        .sort((a, b) => a.group.localeCompare(b.group));

    // Academic overview stats
    const totalQuizzesTaken = allStudents.reduce((sum, s) => sum + s.quizzesTaken, 0);
    const studentsWithQuizzes = allStudents.filter(s => s.quizzesTaken > 0);
    const avgQuizScore = studentsWithQuizzes.length > 0
        ? Math.round(studentsWithQuizzes.reduce((sum, s) => sum + s.averageQuizScore, 0) / studentsWithQuizzes.length)
        : 0;
    const totalLessonsCompleted = allStudents.reduce((sum, s) => sum + s.lessonsCompleted, 0);

    // Top quiz scorers (students with at least 1 quiz)
    const topQuizScorers = studentsWithQuizzes
        .sort((a, b) => b.averageQuizScore - a.averageQuizScore || b.quizzesTaken - a.quizzesTaken)
        .slice(0, 5)
        .map(s => ({ username: s.username, avgScore: s.averageQuizScore, quizCount: s.quizzesTaken }));

    // Grade distribution across all students
    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    for (const s of studentsWithQuizzes) {
        const avg = s.averageQuizScore;
        if (avg >= 90) gradeDistribution.A++;
        else if (avg >= 80) gradeDistribution.B++;
        else if (avg >= 70) gradeDistribution.C++;
        else if (avg >= 60) gradeDistribution.D++;
        else gradeDistribution.F++;
    }

    // Per-course class-wide breakdown
    const courseAgg = new Map<string, { code: string; name: string; totalScore: number; quizCount: number; students: Set<string>; bestStudent: string; bestAvg: number }>();
    for (const s of allStudents) {
        for (const cs of s.courseScores) {
            const existing = courseAgg.get(cs.courseCode) || {
                code: cs.courseCode, name: cs.courseName,
                totalScore: 0, quizCount: 0, students: new Set(), bestStudent: '', bestAvg: 0
            };
            existing.totalScore += cs.avgScore * cs.quizCount;
            existing.quizCount += cs.quizCount;
            existing.students.add(s.username);
            if (cs.avgScore > existing.bestAvg) {
                existing.bestAvg = cs.avgScore;
                existing.bestStudent = s.username;
            }
            courseAgg.set(cs.courseCode, existing);
        }
    }
    const courseBreakdown = [...courseAgg.values()]
        .map(c => ({
            courseCode: c.code,
            courseName: c.name,
            avgScore: c.quizCount > 0 ? Math.round(c.totalScore / c.quizCount) : 0,
            studentsTaken: c.students.size,
            totalQuizzes: c.quizCount,
            bestAvgStudent: c.bestStudent,
        }))
        .sort((a, b) => a.courseCode.localeCompare(b.courseCode));

    return {
        totalStudents: allStudents.length,
        activeToday,
        activeThisWeek,
        avgEngagementScore: avgScore,
        topPerformers,
        atRiskStudents: atRisk,
        sectionBreakdown,
        groupBreakdown,
        totalQuizzesTaken,
        avgQuizScore,
        totalLessonsCompleted,
        topQuizScorers,
        gradeDistribution,
        courseBreakdown,
    };
}

// ──────────────────────────────────────────
// Smart Alert Generation
// ──────────────────────────────────────────

export async function generateSmartAlerts(preloadedStudents?: EngagementScore[]): Promise<void> {
    const supabase = await createServiceRoleClient();
    const allStudents = preloadedStudents ?? await getAllStudentEngagement();

    const alerts: {
        student_username: string;
        alert_type: string;
        severity: string;
        title: string;
        description: string;
    }[] = [];

    // Don't duplicate alerts — check what already exists in last 24h
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const { data: recentAlerts } = await supabase
        .from('safety_alerts')
        .select('student_username, alert_type')
        .gte('created_at', oneDayAgo.toISOString());

    const existingKeys = new Set(
        (recentAlerts || []).map(a => `${a.student_username}-${a.alert_type}`)
    );

    for (const student of allStudents) {
        // 1. Inactive students (no activity in 7+ days)
        if (student.lastActive) {
            const daysSinceActive = Math.floor(
                (Date.now() - new Date(student.lastActive).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceActive >= 7 && !existingKeys.has(`${student.username}-inactive_student`)) {
                alerts.push({
                    student_username: student.username,
                    alert_type: 'inactive_student',
                    severity: daysSinceActive >= 14 ? 'critical' : 'warning',
                    title: `${student.username} inactive for ${daysSinceActive} days`,
                    description: `Last seen: ${new Date(student.lastActive).toLocaleDateString()}. Engagement score: ${student.score}/100.`,
                });
            }
        }

        // 2. High failed logins
        if (student.metrics.loginFrequency === 0 && student.riskScore > 20 &&
            !existingKeys.has(`${student.username}-failed_logins`)) {
            alerts.push({
                student_username: student.username,
                alert_type: 'failed_logins',
                severity: 'warning',
                title: `Multiple failed logins for ${student.username}`,
                description: `Risk score: ${student.riskScore}. This may indicate password issues or unauthorized access attempts.`,
            });
        }

        // 3. Critical engagement
        if (student.score < 10 && student.metrics.loginFrequency > 0 &&
            !existingKeys.has(`${student.username}-activity_drop`)) {
            alerts.push({
                student_username: student.username,
                alert_type: 'activity_drop',
                severity: 'warning',
                title: `${student.username} has critically low engagement`,
                description: `Engagement score: ${student.score}/100. Active ${student.metrics.consistencyStreak} days this month.`,
            });
        }

        // 4. High risk score
        if (student.riskScore >= 50 && !existingKeys.has(`${student.username}-high_risk_score`)) {
            alerts.push({
                student_username: student.username,
                alert_type: 'high_risk_score',
                severity: 'critical',
                title: `${student.username} flagged as high risk`,
                description: `Risk score: ${student.riskScore}. Reports: ${student.reportCount}. Immediate review recommended.`,
            });
        }
    }

    // Batch insert
    if (alerts.length > 0) {
        await supabase.from('safety_alerts').insert(alerts);
    }
}

// ──────────────────────────────────────────
// Get available sections & groups
// ──────────────────────────────────────────

export async function getAvailableSectionsAndGroups(): Promise<{
    sections: string[];
    groups: string[];
}> {
    const supabase = await createServiceRoleClient();

    const { data: students } = await supabase
        .from('allowed_users')
        .select('original_section, original_group');

    const sections = [...new Set((students || []).map(s => s.original_section).filter(Boolean))].sort();
    const groups = [...new Set((students || []).map(s => s.original_group).filter(Boolean))].sort();

    return { sections, groups };
}
