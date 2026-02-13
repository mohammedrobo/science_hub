import { getSession } from '@/app/login/actions';
import { getUserStats, getSubjectPerformance, SubjectPerformance } from '@/lib/gamification';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfilePictureUpload } from './ProfilePictureUpload';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trophy, Target, CalendarDays, Zap, BrainCircuit, Sparkles, ArrowLeft, TrendingUp, BookOpen, Award } from 'lucide-react';
import { getGrade } from '@/lib/utils';

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
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    const stats = await getUserStats(session.username);
    const subjectPerformance = await getSubjectPerformance(session.username);

    if (!stats) {
        redirect('/');
    }

    // Get profile picture URL
    const supabase = await createClient();
    const { data: userStats } = await supabase
        .from('user_stats')
        .select('profile_picture_url')
        .eq('username', session.username)
        .single();

    const { nextRank, xpRequired } = getNextRankXP(stats.currentRank);
    const progressToNext = stats.currentRank === 'SSS' ? 100 : Math.min(100, (stats.totalXp / xpRequired) * 100);

    return (
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl">
            {/* Back Button */}
            <div className="mb-6">
                <Button variant="ghost" asChild className="pl-0 hover:bg-transparent hover:text-primary">
                    <Link href="/" className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to Home</span>
                    </Link>
                </Button>
            </div>

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Student Profile
                </h1>
                <p className="text-muted-foreground">Track your journey and level up</p>
            </div>

            {/* Profile Picture Upload */}
            <Card className="mb-6 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                <CardContent className="pt-6">
                    <ProfilePictureUpload
                        currentPictureUrl={userStats?.profile_picture_url}
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
                        Current Rank
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
                                {stats.currentRank === 'SSS' ? 'MAX RANK' : `Next: ${nextRank} (${xpRequired} XP)`}
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

            {/* Stats Grid - Enhanced */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
                {/* Rank Card */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <Trophy className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Class Rank</p>
                                <p className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                                    {stats.currentRank}-Rank
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
                                <Trophy className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Current Class</p>
                                <p className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                                    {stats.currentRank}-Rank
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
                                {/* Using Zap instead of Star for energy feel */}
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total XP</p>
                                <p className="text-2xl font-bold text-white">{stats.totalXp.toLocaleString()}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Lessons Card */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-500/10 rounded-lg">
                                <Target className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Lessons Watched</p>
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
                                <p className="text-sm text-muted-foreground">Missions Aced</p>
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
                            Predictive Evaluation (GPA)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
                            {/* Cumulative GPA Main Display */}
                            <div className="flex flex-col items-center justify-center p-6 bg-zinc-950/50 rounded-xl border border-zinc-800 shadow-inner">
                                <span className="text-sm text-muted-foreground uppercase tracking-widest mb-2">Projected GPA</span>
                                <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500 drop-shadow-2xl">
                                    {stats.cumulativeGPA}
                                </div>
                                <span className="text-xs text-primary mt-2 flex items-center gap-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    Calculated from Quiz Performance
                                </span>
                            </div>

                            {/* Semester Breakdown */}
                            <div className="md:col-span-2 flex flex-col justify-center gap-4">
                                <div className="space-y-4 p-4 border border-zinc-800 rounded-lg bg-zinc-900/30">
                                    <div className="flex justify-between items-end">
                                        <h4 className="text-zinc-400 font-medium">Quiz Performance (Current Term)</h4>
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
                                    * Projected GPA is now exclusively calculated based on your performance in Quizzes and Missions.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Subject Performance Section */}
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        Subject Performance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {subjectPerformance.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                            Complete quizzes to see your subject-by-subject performance here!
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {subjectPerformance.map((subject) => {
                                const gradeInfo = getGrade(subject.bestScore);
                                return (
                                    <div
                                        key={subject.courseId}
                                        className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 hover:border-zinc-600 transition-colors"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex-1">
                                                <h4 className="font-medium text-zinc-100">
                                                    {subject.courseCode}
                                                </h4>
                                                <p className="text-sm text-zinc-500">{subject.courseName}</p>
                                            </div>

                                            <div className="flex items-center gap-4 sm:gap-6">
                                                {/* Quizzes Count */}
                                                <div className="text-center">
                                                    <p className="text-xs text-zinc-500 uppercase">Quizzes</p>
                                                    <p className="text-lg font-bold text-zinc-200">{subject.quizzesCompleted}</p>
                                                </div>

                                                {/* Average Score */}
                                                <div className="text-center">
                                                    <p className="text-xs text-zinc-500 uppercase">Avg</p>
                                                    <p className="text-lg font-bold text-zinc-200">{subject.averageScore}%</p>
                                                </div>

                                                {/* Best Grade */}
                                                <div className="text-center">
                                                    <p className="text-xs text-zinc-500 uppercase">Best</p>
                                                    <p className={`text-xl font-black ${gradeInfo.color}`}>
                                                        {subject.bestGrade}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mt-3">
                                            <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-500 ${subject.averageScore >= 85 ? 'bg-emerald-500' :
                                                        subject.averageScore >= 70 ? 'bg-blue-500' :
                                                            subject.averageScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`}
                                                    style={{ width: `${subject.averageScore}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div >
    );
}
