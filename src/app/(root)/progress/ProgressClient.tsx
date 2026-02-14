'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    LineChart,
    Line,
    Legend,
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    AreaChart,
    Area,
} from 'recharts';
import {
    TrendingUp,
    BarChart3,
    PieChart as PieChartIcon,
    LineChart as LineChartIcon,
    Target,
    BookOpen,
    BrainCircuit,
    CheckCircle2,
    Clock,
    Award,
    Flame,
    GraduationCap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type {
    SubjectPerformance,
    XPHistoryPoint,
    OverallCompletion,
    QuizScorePoint,
    CourseDetailedProgress,
} from '@/lib/gamification';

// ─── Types ───────────────────────────────────────────────────────────

interface ProgressClientProps {
    subjectPerformance: SubjectPerformance[];
    xpHistory: XPHistoryPoint[];
    overallCompletion: OverallCompletion;
    quizScoreHistory: QuizScorePoint[];
    courseDetailedProgressMap: Record<string, CourseDetailedProgress>;
    username: string;
}

type ChartType = 'pie' | 'column' | 'line';
type ScopeType = 'overall' | string; // 'overall' or a courseId

// ─── Color Helpers ───────────────────────────────────────────────────

const COLORS = {
    emerald: '#10b981',
    blue: '#3b82f6',
    violet: '#8b5cf6',
    amber: '#f59e0b',
    rose: '#f43f5e',
    cyan: '#06b6d4',
    fuchsia: '#d946ef',
    lime: '#84cc16',
    orange: '#f97316',
    teal: '#14b8a6',
};

const CHART_PALETTE = [
    COLORS.emerald,
    COLORS.blue,
    COLORS.violet,
    COLORS.amber,
    COLORS.rose,
    COLORS.cyan,
    COLORS.fuchsia,
    COLORS.lime,
    COLORS.orange,
    COLORS.teal,
];

const COMPLETION_COLORS = {
    completed: COLORS.emerald,
    remaining: '#3f3f46', // zinc-700
};

function getScoreColor(score: number): string {
    if (score >= 85) return COLORS.emerald;
    if (score >= 70) return COLORS.blue;
    if (score >= 60) return COLORS.amber;
    return COLORS.rose;
}

// ─── Custom Tooltip ──────────────────────────────────────────────────

const tooltipStyle = {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    color: '#fff',
    fontSize: '12px',
    borderRadius: '8px',
};

// ─── Main Component ──────────────────────────────────────────────────

export function ProgressClient({
    subjectPerformance,
    xpHistory,
    overallCompletion,
    quizScoreHistory,
    courseDetailedProgressMap,
}: ProgressClientProps) {
    const [scope, setScope] = useState<ScopeType>('overall');
    const [chartType, setChartType] = useState<ChartType>('column');

    const courses = overallCompletion.coursesWithProgress;
    const selectedCourse = scope !== 'overall' ? courseDetailedProgressMap[scope] : null;

    // ─── Derived Data ────────────────────────────────────────────────

    const completionPieData = useMemo(() => {
        if (scope === 'overall') {
            return [
                { name: 'Lessons Done', value: overallCompletion.completedLessons, color: COLORS.emerald },
                { name: 'Quizzes Done', value: overallCompletion.completedQuizzes, color: COLORS.blue },
                {
                    name: 'Remaining',
                    value:
                        overallCompletion.totalLessons +
                        overallCompletion.totalQuizzes -
                        overallCompletion.completedLessons -
                        overallCompletion.completedQuizzes,
                    color: COMPLETION_COLORS.remaining,
                },
            ].filter(d => d.value > 0);
        }
        if (!selectedCourse) return [];
        return [
            { name: 'Lessons Done', value: selectedCourse.completedLessons, color: COLORS.emerald },
            { name: 'Quizzes Done', value: selectedCourse.completedQuizzes, color: COLORS.blue },
            {
                name: 'Remaining',
                value:
                    selectedCourse.totalLessons +
                    selectedCourse.totalQuizzes -
                    selectedCourse.completedLessons -
                    selectedCourse.completedQuizzes,
                color: COMPLETION_COLORS.remaining,
            },
        ].filter(d => d.value > 0);
    }, [scope, overallCompletion, selectedCourse]);

    const barData = useMemo(() => {
        if (scope === 'overall') {
            return subjectPerformance.map(s => ({
                name: s.courseCode,
                score: s.averageScore,
                fill: getScoreColor(s.averageScore),
            }));
        }
        if (!selectedCourse) return [];
        return selectedCourse.quizzes
            .filter(q => q.score !== null)
            .map(q => ({
                name: q.title.length > 20 ? q.title.substring(0, 18) + '…' : q.title,
                score: q.score ?? 0,
                fill: getScoreColor(q.score ?? 0),
            }));
    }, [scope, subjectPerformance, selectedCourse]);

    const lineData = useMemo(() => {
        if (scope === 'overall') {
            return quizScoreHistory;
        }
        const courseCode = selectedCourse?.courseCode;
        if (!courseCode) return [];
        return quizScoreHistory.filter(p => p.courseCode === courseCode);
    }, [scope, quizScoreHistory, selectedCourse]);

    const courseCompletionBars = useMemo(() => {
        return courses.map(c => ({
            name: c.courseCode,
            percent: c.percent,
            completedLessons: c.completedLessons,
            totalLessons: c.totalLessons,
            completedQuizzes: c.completedQuizzes,
            totalQuizzes: c.totalQuizzes,
            fill:
                c.percent >= 80
                    ? COLORS.emerald
                    : c.percent >= 50
                    ? COLORS.blue
                    : c.percent >= 25
                    ? COLORS.amber
                    : COLORS.rose,
        }));
    }, [courses]);

    const radarData = useMemo(() => {
        if (subjectPerformance.length < 3) return [];
        return subjectPerformance.map(s => ({
            subject: s.courseCode,
            score: s.averageScore,
            fullMark: 100,
        }));
    }, [subjectPerformance]);

    // ─── Stats for the summary cards ─────────────────────────────────

    const summaryStats = useMemo(() => {
        if (scope === 'overall') {
            const strongest = subjectPerformance.length > 0
                ? subjectPerformance.reduce((a, b) => (a.averageScore > b.averageScore ? a : b))
                : null;
            const weakest = subjectPerformance.length > 0
                ? subjectPerformance.reduce((a, b) => (a.averageScore < b.averageScore ? a : b))
                : null;
            return {
                completedLessons: overallCompletion.completedLessons,
                totalLessons: overallCompletion.totalLessons,
                completedQuizzes: overallCompletion.completedQuizzes,
                totalQuizzes: overallCompletion.totalQuizzes,
                overallPercent: overallCompletion.overallPercent,
                strongestSubject: strongest?.courseCode ?? '-',
                strongestScore: strongest?.averageScore ?? 0,
                weakestSubject: weakest?.courseCode ?? '-',
                weakestScore: weakest?.averageScore ?? 0,
            };
        }
        if (!selectedCourse) {
            return {
                completedLessons: 0, totalLessons: 0,
                completedQuizzes: 0, totalQuizzes: 0,
                overallPercent: 0,
                strongestSubject: '-', strongestScore: 0,
                weakestSubject: '-', weakestScore: 0,
            };
        }
        const quizScores = selectedCourse.quizzes.filter(q => q.score !== null).map(q => q.score!);
        const best = quizScores.length > 0 ? Math.max(...quizScores) : 0;
        const worst = quizScores.length > 0 ? Math.min(...quizScores) : 0;
        return {
            completedLessons: selectedCourse.completedLessons,
            totalLessons: selectedCourse.totalLessons,
            completedQuizzes: selectedCourse.completedQuizzes,
            totalQuizzes: selectedCourse.totalQuizzes,
            overallPercent: selectedCourse.overallPercent,
            strongestSubject: best > 0 ? `Best: ${best}%` : '-',
            strongestScore: best,
            weakestSubject: worst > 0 ? `Lowest: ${worst}%` : '-',
            weakestScore: worst,
        };
    }, [scope, overallCompletion, subjectPerformance, selectedCourse]);

    // ─── Render ──────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* ─── Controls Bar ─────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                {/* Scope Selector */}
                <div className="w-full sm:w-72">
                    <Select value={scope} onValueChange={(v) => setScope(v as ScopeType)}>
                        <SelectTrigger className="bg-zinc-900/80 border-zinc-700 hover:border-zinc-600 transition-colors h-11">
                            <SelectValue placeholder="Select scope" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                            <SelectItem value="overall" className="focus:bg-violet-500/10 focus:text-violet-300">📊 Overall Progress</SelectItem>
                            {courses.map((c) => (
                                <SelectItem key={c.courseId} value={c.courseId} className="focus:bg-blue-500/10 focus:text-blue-300">
                                    📘 {c.courseCode} — {c.courseName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Chart Type Toggle — Guild Hall Style */}
                <div className="flex gap-2 p-1 w-full sm:w-auto">
                    {[
                        {
                            key: 'column' as ChartType,
                            label: 'Column',
                            icon: BarChart3,
                            activeColors: 'bg-gradient-to-b from-blue-500/20 to-blue-600/5 text-blue-300 border-blue-500/40 shadow-blue-500/20',
                            iconColor: 'text-blue-400',
                        },
                        {
                            key: 'pie' as ChartType,
                            label: 'Pie',
                            icon: PieChartIcon,
                            activeColors: 'bg-gradient-to-b from-violet-500/20 to-violet-600/5 text-violet-300 border-violet-500/40 shadow-violet-500/20',
                            iconColor: 'text-violet-400',
                        },
                        {
                            key: 'line' as ChartType,
                            label: 'Line',
                            icon: LineChartIcon,
                            activeColors: 'bg-gradient-to-b from-emerald-500/20 to-emerald-600/5 text-emerald-300 border-emerald-500/40 shadow-emerald-500/20',
                            iconColor: 'text-emerald-400',
                        },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = chartType === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setChartType(tab.key)}
                                className={[
                                    'flex-1 sm:flex-initial relative group px-4 py-2.5 rounded-xl font-medium transition-all duration-200',
                                    'flex items-center justify-center gap-2',
                                    isActive
                                        ? `${tab.activeColors} border shadow-lg`
                                        : 'bg-zinc-900/40 text-zinc-500 border border-zinc-800/50 hover:bg-zinc-800/50 hover:text-zinc-300 hover:border-zinc-700',
                                ].join(' ')}
                            >
                                <Icon className={[
                                    'w-4 h-4 transition-colors',
                                    isActive ? tab.iconColor : 'text-zinc-600 group-hover:text-zinc-400',
                                ].join(' ')} />
                                <span className="text-xs sm:text-sm">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ─── Summary Stat Cards ───────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                    icon={<BookOpen className="h-5 w-5 text-emerald-400" />}
                    label="Lessons"
                    value={`${summaryStats.completedLessons}/${summaryStats.totalLessons}`}
                    sub={`${summaryStats.totalLessons > 0 ? Math.round((summaryStats.completedLessons / summaryStats.totalLessons) * 100) : 0}% done`}
                    accentColor="emerald"
                />
                <StatCard
                    icon={<BrainCircuit className="h-5 w-5 text-blue-400" />}
                    label="Quizzes"
                    value={`${summaryStats.completedQuizzes}/${summaryStats.totalQuizzes}`}
                    sub={`${summaryStats.totalQuizzes > 0 ? Math.round((summaryStats.completedQuizzes / summaryStats.totalQuizzes) * 100) : 0}% done`}
                    accentColor="blue"
                />
                <StatCard
                    icon={<CheckCircle2 className="h-5 w-5 text-violet-400" />}
                    label="Overall"
                    value={`${summaryStats.overallPercent}%`}
                    sub="completion"
                    accentColor="violet"
                />
                <StatCard
                    icon={<Award className="h-5 w-5 text-amber-400" />}
                    label={scope === 'overall' ? 'Strongest' : 'Best Quiz'}
                    value={summaryStats.strongestSubject}
                    sub={scope === 'overall' && summaryStats.strongestScore > 0 ? `${summaryStats.strongestScore}% avg` : ''}
                    accentColor="amber"
                />
            </div>

            {/* ─── Main Chart Panel ─────────────────────────────────── */}
            <Card className={`bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 overflow-hidden ${
                chartType === 'column' ? 'border-t-blue-500/50 border-t-2' :
                chartType === 'pie' ? 'border-t-violet-500/50 border-t-2' :
                'border-t-emerald-500/50 border-t-2'
            }`}>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        {chartType === 'pie' && <PieChartIcon className="h-5 w-5 text-violet-400" />}
                        {chartType === 'column' && <BarChart3 className="h-5 w-5 text-blue-400" />}
                        {chartType === 'line' && <TrendingUp className="h-5 w-5 text-emerald-400" />}
                        {chartType === 'pie' && 'Completion Breakdown'}
                        {chartType === 'column' && (scope === 'overall' ? 'Average Score by Course' : 'Quiz Scores')}
                        {chartType === 'line' && (scope === 'overall' ? 'Quiz Score Trend' : 'Score Trend')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] sm:h-[360px] w-full">
                        {chartType === 'pie' && <CompletionPieChart data={completionPieData} />}
                        {chartType === 'column' && <ScoreBarChart data={barData} />}
                        {chartType === 'line' && <ScoreLineChart data={lineData} />}
                    </div>
                </CardContent>
            </Card>

            {/* ─── Secondary Charts Row ─────────────────────────────── */}
            <div className={`grid grid-cols-1 ${radarData.length >= 3 && scope === 'overall' ? 'lg:grid-cols-2' : ''} gap-4`}>
                {/* XP Progress Over Time */}
                {xpHistory.length > 1 && (
                    <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Flame className="h-5 w-5 text-orange-400" />
                                XP Journey
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px] sm:h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={xpHistory}>
                                        <defs>
                                            <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="date" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} width={35} />
                                        <Tooltip
                                            contentStyle={tooltipStyle}
                                            formatter={(value) => [`${value} XP`, 'Total XP']}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="xp"
                                            stroke={COLORS.emerald}
                                            strokeWidth={2}
                                            fill="url(#xpGrad)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Radar Chart — Overall only */}
                {scope === 'overall' && radarData.length >= 3 && (
                    <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Target className="h-5 w-5 text-violet-400" />
                                Performance Radar
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px] sm:h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                        <PolarGrid stroke="#333" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#666', fontSize: 10 }} tickCount={5} />
                                        <Radar name="Score" dataKey="score" stroke={COLORS.violet} fill={COLORS.violet} fillOpacity={0.25} strokeWidth={2} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* ─── Course Completion Overview (Overall only) ─────────── */}
            {scope === 'overall' && courseCompletionBars.length > 0 && (
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <GraduationCap className="h-5 w-5 text-cyan-400" />
                            Completion by Course
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {courseCompletionBars.map(c => (
                                <div key={c.name} className="space-y-1">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-zinc-300 font-medium">{c.name}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-zinc-500">
                                                {c.completedLessons}/{c.totalLessons} lessons · {c.completedQuizzes}/{c.totalQuizzes} quizzes
                                            </span>
                                            <Badge
                                                variant="secondary"
                                                className={`text-xs ${
                                                    c.percent >= 80
                                                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                                        : c.percent >= 50
                                                        ? 'bg-blue-950 text-blue-400 border-blue-800'
                                                        : c.percent >= 25
                                                        ? 'bg-amber-950 text-amber-400 border-amber-800'
                                                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                                }`}
                                            >
                                                {c.percent}%
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${c.percent}%`, backgroundColor: c.fill }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ─── Lesson-by-Lesson Breakdown (Course scope only) ──── */}
            {scope !== 'overall' && selectedCourse && (
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <BookOpen className="h-5 w-5 text-emerald-400" />
                            Lesson Progress — {selectedCourse.courseCode}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {selectedCourse.lessons.length === 0 ? (
                            <p className="text-center text-muted-foreground py-6">No lessons found for this course.</p>
                        ) : (
                            <div className="space-y-2">
                                {selectedCourse.lessons.map((lesson, idx) => (
                                    <div
                                        key={lesson.lessonId}
                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                            lesson.isCompleted
                                                ? 'bg-emerald-950/20 border-emerald-900/40'
                                                : 'bg-zinc-800/30 border-zinc-700/40'
                                        }`}
                                    >
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                                lesson.isCompleted
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-zinc-700 text-zinc-400'
                                            }`}
                                        >
                                            {lesson.isCompleted ? '✓' : idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium truncate ${
                                                lesson.isCompleted ? 'text-emerald-300' : 'text-zinc-300'
                                            }`}>
                                                {lesson.title}
                                            </p>
                                            {lesson.completedAt && (
                                                <p className="text-xs text-zinc-500">
                                                    Completed {new Date(lesson.completedAt).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                    })}
                                                </p>
                                            )}
                                        </div>
                                        {lesson.isCompleted ? (
                                            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                                        ) : (
                                            <Clock className="h-5 w-5 text-zinc-600 shrink-0" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ─── Quiz Details Table (Course scope only) ─────────── */}
            {scope !== 'overall' && selectedCourse && selectedCourse.quizzes.length > 0 && (
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <BrainCircuit className="h-5 w-5 text-blue-400" />
                            Quiz Results — {selectedCourse.courseCode}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {selectedCourse.quizzes.map(quiz => (
                                <div
                                    key={quiz.quizId}
                                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                        quiz.score !== null
                                            ? 'bg-blue-950/20 border-blue-900/40'
                                            : 'bg-zinc-800/30 border-zinc-700/40'
                                    }`}
                                >
                                    <div
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black shrink-0 ${
                                            quiz.score !== null
                                                ? quiz.score >= 85
                                                    ? 'bg-emerald-600/20 text-emerald-400'
                                                    : quiz.score >= 70
                                                    ? 'bg-blue-600/20 text-blue-400'
                                                    : quiz.score >= 60
                                                    ? 'bg-amber-600/20 text-amber-400'
                                                    : 'bg-red-600/20 text-red-400'
                                                : 'bg-zinc-700 text-zinc-500'
                                        }`}
                                    >
                                        {quiz.grade}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-zinc-200 truncate">
                                            {quiz.title}
                                        </p>
                                        {quiz.completedAt && (
                                            <p className="text-xs text-zinc-500">
                                                {new Date(quiz.completedAt).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </p>
                                        )}
                                    </div>
                                    {quiz.score !== null ? (
                                        <span className="text-lg font-bold text-zinc-200">{quiz.score}%</span>
                                    ) : (
                                        <Badge variant="secondary" className="bg-zinc-800 text-zinc-500 border-zinc-700">
                                            Not taken
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// ─── Stat Card Component ─────────────────────────────────────────────

function StatCard({
    icon,
    label,
    value,
    sub,
    accentColor,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub: string;
    accentColor: string;
}) {
    const colorMap: Record<string, string> = {
        emerald: 'border-l-emerald-500 from-emerald-500/5',
        blue: 'border-l-blue-500 from-blue-500/5',
        violet: 'border-l-violet-500 from-violet-500/5',
        amber: 'border-l-amber-500 from-amber-500/5',
        rose: 'border-l-rose-500 from-rose-500/5',
        cyan: 'border-l-cyan-500 from-cyan-500/5',
    };
    const accent = colorMap[accentColor] || colorMap.blue;

    return (
        <Card className={`bg-gradient-to-r ${accent} to-zinc-900/50 border-zinc-800 border-l-2 hover:border-l-4 transition-all duration-200`}>
            <CardContent className="pt-5 pb-4 px-4">
                <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-zinc-800/80 rounded-lg shrink-0">
                        {icon}
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                        <p className="text-xl font-bold text-white truncate">{value}</p>
                        {sub && <p className="text-xs text-zinc-500">{sub}</p>}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Pie Chart ───────────────────────────────────────────────────────

function CompletionPieChart({ data }: { data: { name: string; value: number; color: string }[] }) {
    if (data.length === 0) {
        return <EmptyChart message="No progress data yet. Start completing lessons!" />;
    }

    const total = data.reduce((sum, d) => sum + d.value, 0);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                >
                    {data.map((entry, index) => (
                        <Cell key={`pie-${index}`} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [
                        `${value} (${total > 0 ? Math.round((Number(value) / total) * 100) : 0}%)`,
                        name,
                    ]}
                />
                <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                        <span className="text-zinc-400 text-xs">{value}</span>
                    )}
                />
                {/* Center label */}
                <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="fill-white text-3xl font-bold">
                    {data.filter(d => d.name !== 'Remaining').reduce((s, d) => s + d.value, 0)}
                </text>
                <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-zinc-500 text-xs">
                    completed
                </text>
            </PieChart>
        </ResponsiveContainer>
    );
}

// ─── Bar Chart ───────────────────────────────────────────────────────

function ScoreBarChart({ data }: { data: { name: string; score: number; fill: string }[] }) {
    if (data.length === 0) {
        return <EmptyChart message="No quiz scores yet. Complete some quizzes!" />;
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#666" fontSize={10} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#666" fontSize={11} tickLine={false} axisLine={false} width={60} />
                <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`${value}%`, 'Score']}
                />
                <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={22}>
                    {data.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

// ─── Line Chart ──────────────────────────────────────────────────────

function ScoreLineChart({ data }: { data: QuizScorePoint[] }) {
    if (data.length === 0) {
        return <EmptyChart message="No quiz history yet. Scores will appear here over time!" />;
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="#666" fontSize={10} tickLine={false} axisLine={false} width={30} />
                <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, _name, props) => [
                        `${value}%`,
                        (props?.payload as QuizScorePoint)?.quizTitle ?? '',
                    ]}
                    labelFormatter={(label) => `Date: ${label}`}
                />
                <Line
                    type="monotone"
                    dataKey="score"
                    stroke={COLORS.violet}
                    strokeWidth={2.5}
                    dot={{ fill: COLORS.violet, r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: COLORS.violet, stroke: '#fff', strokeWidth: 2 }}
                />
                {/* Reference line at 60% passing */}
                <CartesianGrid strokeDasharray="0" stroke="transparent" />
            </LineChart>
        </ResponsiveContainer>
    );
}

// ─── Empty State ─────────────────────────────────────────────────────

function EmptyChart({ message }: { message: string }) {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-zinc-800/50 rounded-full mb-3">
                <BarChart3 className="h-8 w-8 text-zinc-600" />
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
        </div>
    );
}
