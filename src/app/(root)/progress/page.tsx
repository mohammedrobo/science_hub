import { readSession } from '@/lib/auth/session-read';
import { redirect } from 'next/navigation';
import {
    getUserStats,
    getSubjectPerformance,
    getXPHistory,
    getOverallCompletion,
    getQuizScoreHistory,
    getCoursesDetailedProgress,
} from '@/lib/gamification';
import { ProgressClient } from './ProgressClient';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Zap } from 'lucide-react';

export default async function ProgressPage() {
    const session = await readSession();

    if (!session) {
        redirect('/login');
    }

    // Fetch all progress data in parallel
    const [stats, subjectPerformance, xpHistory, overallCompletion, quizScoreHistory] =
        await Promise.all([
            getUserStats(session.username),
            getSubjectPerformance(session.username),
            getXPHistory(session.username),
            getOverallCompletion(session.username),
            getQuizScoreHistory(session.username),
        ]);

    if (!stats) {
        redirect('/');
    }

    // Fetch detailed progress for all courses in one batched call
    const courseIds = overallCompletion.coursesWithProgress.map(c => c.courseId);
    const courseDetailedProgressMap = await getCoursesDetailedProgress(session.username, courseIds);

    return (
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-5xl">
            {/* Back Button */}
            <div className="mb-6">
                <Button variant="ghost" asChild className="pl-0 hover:bg-transparent hover:text-primary">
                    <Link href="/profile" className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to Profile</span>
                    </Link>
                </Button>
            </div>

            {/* Header */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        My Progress
                    </h1>
                    <p className="text-muted-foreground">
                        Detailed analytics of your learning journey
                    </p>
                </div>

                {/* Quick stats badge strip */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 rounded-full border border-zinc-700 text-sm">
                        <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                        <span className="text-zinc-300 font-medium">{stats.currentRank}-Rank</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 rounded-full border border-zinc-700 text-sm">
                        <Zap className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-zinc-300 font-medium">{stats.totalXp.toLocaleString()} XP</span>
                    </div>
                </div>
            </div>

            {/* Main Interactive Progress Dashboard */}
            <ProgressClient
                subjectPerformance={subjectPerformance}
                xpHistory={xpHistory}
                overallCompletion={overallCompletion}
                quizScoreHistory={quizScoreHistory}
                courseDetailedProgressMap={courseDetailedProgressMap}
                username={session.username}
            />
        </div>
    );
}
