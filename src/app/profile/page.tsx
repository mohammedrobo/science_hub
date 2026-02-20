import { readSession } from '@/lib/auth/session-read';
import { getUserStats, getSubjectPerformance, getOverallCompletion } from '@/lib/gamification';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfilePictureUpload } from './ProfilePictureUpload';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trophy, Target, Zap, BrainCircuit, Sparkles, ArrowLeft, TrendingUp, BookOpen, Award, BarChart3, ChevronRight, CheckCircle2, PieChart } from 'lucide-react';
import { getGrade } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';

function getRankColor(rank: string): string {
    const colors: Record<string, string> = {
        'E': 'from-zinc-600 to-zinc-700',
        'D': 'from-green-600 to-green-700',
        'C': 'from-blue-600 to-blue-700',
        'B': 'from-purple-600 to-purple-700',
        'A': 'from-yellow-600 to-yellow-700',
        'S': 'from-red-600 to-red-700',
        'SS': 'from-orange-600 to-orange-700',
        'SSS': 'from-pink-600 to-pink-700'
    };
    return colors[rank] || colors['E'];
}

function getNextRankXP(rank: string): { nextRank: string; xpRequired: number } {
    const ranks: Record<string, { next: string; xp: number }> = {
        'E': { next: 'D', xp: 300 },
        'D': { next: 'C', xp: 750 },
        'C': { next: 'B', xp: 1500 },
        'B': { next: 'A', xp: 3000 },
        'A': { next: 'S', xp: 5000 },
        'S': { next: 'SS', xp: 7500 },
        'SS': { next: 'SSS', xp: 10000 },
        'SSS': { next: 'MAX', xp: 10000 }
    };
    const rankData = ranks[rank] || ranks['E'];
    return { nextRank: rankData.next, xpRequired: rankData.xp };
}

export default async function ProfilePage() {
    const session = await readSession();
    const t = await getTranslations('profile');
    const tc = await getTranslations('common');

    if (!session) {
        redirect('/login');
    }

    const [stats, subjectPerformance, overallCompletion] = await Promise.all([
        getUserStats(session.username),
        getSubjectPerformance(session.username),
        getOverallCompletion(session.username),
    ]);

    if (!stats) {
        redirect('/');
    }

    const { nextRank, xpRequired } = getNextRankXP(stats.currentRank);
    const progressToNext = stats.currentRank === 'SSS' ? 100 : Math.min(100, (stats.totalXp / xpRequired) * 100);

    return (
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl">
            {/* Back Button */}
            <div className="mb-6">
                <Button variant="ghost" asChild className="pl-0 hover:bg-transparent hover:text-primary">
                    <Link href="/" className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        <span>{tc('backToHome')}</span>
                    </Link>
                </Button>
            </div>

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Student Profile
                </h1>
                <p className="text-muted-foreground">{t('trackJourney')}</p>
            </div>

            {/* Profile Picture Upload */}
            <Card className="mb-6 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                <CardContent className="pt-6">
                    <ProfilePictureUpload
                        currentPictureUrl={stats.profilePictureUrl}
                        username={session.username}
                    />
                </CardContent>
            </Card>

            {/* Rank Card */}
            <Card className="mb-6 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <Trophy className="h-6 w-6 text-yellow-500" />
                        {t('currentRank')}
                    </CardTitle>
                </CardHeader>

                <CardContent className="relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-6">
                        <div className={`
                            w-24 h-24 rounded-2xl flex items-center justify-center
                            bg-gradient-to-br ${getRankColor(stats.currentRank)}
                            border-4 border-white/20 shadow-2xl
                        `}>
                            <span className="text-4xl font-black text-white">
                                {stats.currentRank}
                            </span>
                        </div>

                        <div className="flex-1">
                            <h3 className="text-xl sm:text-3xl font-bold text-white mb-2">
                                {stats.fullName}
                            </h3>
                            <p className="text-zinc-400">@{stats.username}</p>
                        </div>
                    </div>

                    {/* XP Progress */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">
                                {stats.totalXp} XP
                            </span>
                            <span className="text-zinc-400">
                                {stats.currentRank === 'SSS' ? t('maxRank') : t('nextRankLabel', { rank: nextRank, xp: xpRequired })}
                            </span>
                        </div>

                        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                                style={{ width: `${progressToNext}%` }}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Grid - Enhanced 3x2 */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
                {/* Rank Card */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <Trophy className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{t('classRank')}</p>
                                <p className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                                    {stats.currentRank}-Rank
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* GPA Card */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-orange-500/10 rounded-lg">
                                <TrendingUp className="h-6 w-6 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{t('gpa')}</p>
                                <p className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                                    {stats.cumulativeGPA}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* XP Card */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-yellow-500/10 rounded-lg">
                                <Zap className="h-6 w-6 text-yellow-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{t('totalXp')}</p>
                                <p className="text-2xl font-bold text-white">{stats.totalXp.toLocaleString()}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Overall Completion Card */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-emerald-500/10 rounded-lg">
                                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{t('completion')}</p>
                                <p className="text-2xl font-bold text-emerald-400">
                                    {overallCompletion.overallPercent}%
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Lessons Card */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-500/10 rounded-lg">
                                <BookOpen className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{t('lessons')}</p>
                                <p className="text-2xl font-bold text-white">{stats.completedLessons}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quizzes Card */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-500/10 rounded-lg">
                                <BrainCircuit className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{t('missionsAced')}</p>
                                <p className="text-2xl font-bold text-white">{stats.completedQuizzes}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Predictive GPA Section */}
            <div className="mb-8">
                <Card className="bg-gradient-to-br from-zinc-900 to-black border-zinc-800 overflow-hidden relative group">
                    <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors duration-500" />
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Sparkles className="w-5 h-5 text-yellow-400" />
                            {t('predictiveEvaluation')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
                            {/* Cumulative GPA Main Display */}
                            <div className="flex flex-col items-center justify-center p-6 bg-zinc-950/50 rounded-xl border border-zinc-800 shadow-inner">
                                <span className="text-sm text-muted-foreground uppercase tracking-widest mb-2">{t('projectedGpa')}</span>
                                <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500 drop-shadow-2xl">
                                    {stats.cumulativeGPA}
                                </div>
                                <span className="text-xs text-primary mt-2 flex items-center gap-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    {t('calculatedFrom')}
                                </span>
                            </div>

                            {/* Semester Breakdown */}
                            <div className="md:col-span-2 flex flex-col justify-center gap-4">
                                <div className="space-y-4 p-4 border border-zinc-800 rounded-lg bg-zinc-900/30">
                                    <div className="flex justify-between items-end">
                                        <h4 className="text-zinc-400 font-medium">{t('quizPerformance')}</h4>
                                        <span className="text-2xl font-bold text-white">{stats.gpaS2}</span>
                                    </div>
                                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-fuchsia-500"
                                            style={{ width: `${(parseFloat(stats.gpaS2) / 4.0) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                <p className="text-xs text-zinc-500 italic mt-2">
                                    {t('gpaDisclaimer')}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Subject Snapshot + Strongest Subject */}
            {subjectPerformance.length > 0 && (() => {
                const strongest = subjectPerformance.reduce((a, b) => a.averageScore > b.averageScore ? a : b);
                const strongestGrade = getGrade(strongest.bestScore);
                return (
                    <Card className="mb-8 bg-zinc-900/50 border-zinc-800">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Award className="h-5 w-5 text-amber-400" />
                                {t('topPerformingSubject')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-950/30 to-transparent rounded-lg border border-amber-900/30">
                                <div className="w-14 h-14 rounded-xl bg-amber-600/20 flex items-center justify-center shrink-0">
                                    <span className={`text-2xl font-black ${strongestGrade.color}`}>{strongest.bestGrade}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-lg font-bold text-white">{strongest.courseCode}</h4>
                                    <p className="text-sm text-zinc-400 truncate">{strongest.courseName}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-2xl font-bold text-amber-400">{strongest.averageScore}%</p>
                                    <p className="text-xs text-zinc-500">{t('avgScore')}</p>
                                </div>
                            </div>

                            {/* Mini course completion bars */}
                            <div className="mt-4 space-y-2">
                                {overallCompletion.coursesWithProgress.slice(0, 4).map(c => (
                                    <div key={c.courseId} className="flex items-center gap-3">
                                        <span className="text-xs text-zinc-400 w-12 shrink-0 font-medium">{c.courseCode}</span>
                                        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    c.percent >= 80 ? 'bg-emerald-500' :
                                                    c.percent >= 50 ? 'bg-blue-500' :
                                                    c.percent >= 25 ? 'bg-amber-500' : 'bg-zinc-600'
                                                }`}
                                                style={{ width: `${c.percent}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-zinc-500 w-8 text-right">{c.percent}%</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                );
            })()}

            {/* View Detailed Progress CTA */}
            <Link href="/progress" className="block">
                <Card className="bg-gradient-to-r from-violet-950/50 via-zinc-900 to-blue-950/50 border-zinc-700 hover:border-primary/50 transition-all duration-300 group cursor-pointer">
                    <CardContent className="py-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                                    <BarChart3 className="h-7 w-7 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                                        {t('viewDetailedProgress')}
                                    </h3>
                                    <p className="text-sm text-zinc-400">
                                        {t('detailedProgressDesc')}
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="h-6 w-6 text-zinc-500 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                    </CardContent>
                </Card>
            </Link>
        </div >
    );
}
