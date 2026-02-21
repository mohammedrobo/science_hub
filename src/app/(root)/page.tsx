'use client';
import { useState, useEffect, useTransition } from 'react';

import { useSemesterStore } from '@/stores/semester-store';
import { CourseGrid } from '@/components/courses/CourseGrid';
import { MOCK_COURSES } from '@/lib/data/mocks';
import { getCourseProgress } from '@/app/actions/progress';
import { useTranslations } from 'next-intl';

export default function Dashboard() {
    const [progress, setProgress] = useState<Record<string, number>>({});
    const [, startTransition] = useTransition();
    const t = useTranslations('home');
    const tc = useTranslations('common');

    useEffect(() => {
        // Load progress in background without blocking UI
        startTransition(() => {
            getCourseProgress().then(setProgress);
        });
    }, []);

    const { semester, hasHydrated } = useSemesterStore();
    const filteredCourses = MOCK_COURSES.filter(c => c.semester === semester);

    if (!hasHydrated) return null;

    return (
        <div className="flex-1 w-full relative">
            {/* Atmospheric Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[min(800px,200vw)] h-[400px] bg-violet-900/20 blur-[120px] rounded-full pointer-events-none -z-10" />

            {/* Hero Section - Comprehensive Welcome */}
            <div className="bg-card/80 border-b border-border mb-8 sm:mb-12">
                <div className="container mx-auto px-4 py-10 sm:py-14">
                    <h1 className="text-3xl sm:text-5xl font-bold text-zinc-100 mb-4 tracking-tight">
                        {t('welcomeTo')} <span className="gradient-text">Science Hub</span>
                    </h1>

                    <p className="text-base sm:text-lg text-zinc-400 max-w-3xl leading-relaxed mb-3">
                        {t('heroDescription')}
                    </p>

                    {/* How It Works Guide */}
                    <div className="glass-card rounded-xl p-4 sm:p-5 mb-6">
                        <h2 className="text-sm font-semibold text-violet-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                            {t('howItWorks')}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-zinc-400">
                            <div className="flex items-start gap-2">
                                <span className="text-violet-400 mt-0.5 shrink-0">1.</span>
                                <span>{t.rich('step1', {
                                    course: (chunks) => <span className="text-zinc-300">{chunks}</span>,
                                    chapter: (chunks) => <span className="text-zinc-300">{chunks}</span>,
                                    video: (chunks) => <span className="text-zinc-300">{chunks}</span>,
                                })}</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-violet-400 mt-0.5 shrink-0">2.</span>
                                <span>{t.rich('step2', {
                                    quiz: (chunks) => <span className="text-zinc-300">{chunks}</span>,
                                })}</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-violet-400 mt-0.5 shrink-0">3.</span>
                                <span>{t.rich('step3', {
                                    firstAttempt: (chunks) => <span className="text-zinc-300">{chunks}</span>,
                                    zeroXP: (chunks) => <span className="text-amber-400">{chunks}</span>,
                                })}</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-violet-400 mt-0.5 shrink-0">4.</span>
                                <span>{t.rich('step4', {
                                    progress: (chunks) => <span className="text-zinc-300">{chunks}</span>,
                                    leaderboard: (chunks) => <span className="text-zinc-300">{chunks}</span>,
                                })}</span>
                            </div>
                        </div>
                    </div>

                    {/* XP System Explained */}
                    <div className="glass-card rounded-xl p-4 sm:p-5 mb-6">
                        <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                            {t('xpRankingSystem')}
                        </h2>
                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                            {/* XP Earnings */}
                            <div className="flex-1 space-y-1.5 text-sm">
                                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">{t('howYouEarnXP')}</p>
                                <div className="flex items-center justify-between text-zinc-400">
                                    <span>{t('quizScore100')}</span>
                                    <span className="text-amber-400 font-mono font-semibold">+100 XP</span>
                                </div>
                                <div className="flex items-center justify-between text-zinc-400">
                                    <span>{t('quizScore80')}</span>
                                    <span className="text-emerald-400 font-mono font-semibold">+50 XP</span>
                                </div>
                                <div className="flex items-center justify-between text-zinc-400">
                                    <span>{t('quizScore60')}</span>
                                    <span className="text-blue-400 font-mono font-semibold">+20 XP</span>
                                </div>
                                <div className="flex items-center justify-between text-zinc-400">
                                    <span>{t('quizScoreBelow60')}</span>
                                    <span className="text-zinc-500 font-mono font-semibold">+0 XP</span>
                                </div>
                                <p className="text-xs text-zinc-600 mt-2 italic">
                                    {t.rich('xpWarning', {
                                        firstAttempt: (chunks) => <span className="text-zinc-400">{chunks}</span>,
                                    })}
                                </p>
                            </div>

                            {/* Rank Ladder */}
                            <div className="flex-1 space-y-1.5 text-sm">
                                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">{t('rankLadder')}</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    <div className="flex items-center gap-1.5"><span>🌱</span><span className="text-zinc-500">E</span><span className="text-zinc-600 text-xs">— 0 XP</span></div>
                                    <div className="flex items-center gap-1.5"><span>🎯</span><span className="text-orange-400">D</span><span className="text-zinc-600 text-xs">— 300 XP</span></div>
                                    <div className="flex items-center gap-1.5"><span>✨</span><span className="text-yellow-400">C</span><span className="text-zinc-600 text-xs">— 750 XP</span></div>
                                    <div className="flex items-center gap-1.5"><span>🌟</span><span className="text-emerald-400">B</span><span className="text-zinc-600 text-xs">— 1,500 XP</span></div>
                                    <div className="flex items-center gap-1.5"><span>💎</span><span className="text-blue-400">A</span><span className="text-zinc-600 text-xs">— 3,000 XP</span></div>
                                    <div className="flex items-center gap-1.5"><span>⚡</span><span className="text-violet-400">S</span><span className="text-zinc-600 text-xs">— 5,000 XP</span></div>
                                    <div className="flex items-center gap-1.5"><span>🔥</span><span className="text-red-400">SS</span><span className="text-zinc-600 text-xs">— 7,500 XP</span></div>
                                    <div className="flex items-center gap-1.5"><span>👑</span><span className="text-amber-400">SSS</span><span className="text-zinc-600 text-xs">— 10,000 XP</span></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
                        <div className="glass-card glow-hover rounded-xl p-3 sm:p-4 transition-all duration-300 cursor-default">
                            <div className="text-violet-400 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect width="15" height="14" x="1" y="5" rx="2" ry="2" /></svg>
                            </div>
                            <h3 className="text-sm font-semibold text-zinc-200">{t('videoLectures')}</h3>
                            <p className="text-xs text-zinc-500 mt-1">{t('videoLecturesDesc')}</p>
                        </div>
                        <div className="glass-card glow-hover rounded-xl p-3 sm:p-4 transition-all duration-300 cursor-default" style={{ ['--glow-color' as string]: 'rgba(16, 185, 129, 0.3)' }}>
                            <div className="text-emerald-400 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
                            </div>
                            <h3 className="text-sm font-semibold text-zinc-200">{t('progressDashboard')}</h3>
                            <p className="text-xs text-zinc-500 mt-1">{t('progressDashboardDesc')}</p>
                        </div>
                        <div className="glass-card glow-hover rounded-xl p-3 sm:p-4 transition-all duration-300 cursor-default">
                            <div className="text-yellow-400 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
                            </div>
                            <h3 className="text-sm font-semibold text-zinc-200">{t('rankingLeaderboard')}</h3>
                            <p className="text-xs text-zinc-500 mt-1">{t('rankingLeaderboardDesc')}</p>
                        </div>
                        <div className="glass-card glow-hover rounded-xl p-3 sm:p-4 transition-all duration-300 cursor-default">
                            <div className="text-fuchsia-400 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" /></svg>
                            </div>
                            <h3 className="text-sm font-semibold text-zinc-200">{t('quizzesGpa')}</h3>
                            <p className="text-xs text-zinc-500 mt-1">{t('quizzesGpaDesc')}</p>
                        </div>
                    </div>

                    {/* Term Status */}
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="text-zinc-500">{t('currentView')}</span>
                        <span className="font-semibold text-violet-400">{t('term', { number: semester })}</span>
                        <span className="text-zinc-600">•</span>
                        {semester === 1 ? (
                            <span className="text-red-400 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                {t('term1Closed')}
                            </span>
                        ) : (
                            <span className="text-emerald-400 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                {t('term2Active')}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 pb-20">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Main Content: Course Grid */}
                    <div className="lg:col-span-3">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                <span className="w-1 h-8 bg-violet-500 rounded-full inline-block shadow-[0_0_10px_rgba(139,92,246,0.5)]"></span>
                                {t('currentModules')}
                            </h2>
                            <span className="text-sm text-zinc-500 italic">{tc('showing', { count: filteredCourses.length })}</span>
                        </div>

                        {/* Course Grid */}
                        <CourseGrid courses={filteredCourses} progress={progress} />
                    </div>

                    {/* Sidebar: Academic Tools */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="glass-card p-6 rounded-xl sticky top-24 hover:shadow-lg transition-shadow duration-200">
                            <h3 className="font-bold text-lg text-violet-400 mb-4 pb-2 border-b border-border">
                                {t('academicTools')}
                            </h3>
                            <ul className="space-y-3">
                                <li>
                                    <a
                                        href="/tools/gpa"
                                        className="flex items-center gap-3 text-zinc-400 hover:text-violet-300 transition-colors group active:scale-[0.98]"
                                    >
                                        <div className="p-2 bg-zinc-900 text-zinc-500 group-hover:bg-violet-900/20 group-hover:text-violet-400 rounded transition-colors duration-200 border border-zinc-800">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><line x1="16" x2="16" y1="14" y2="18" /><path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" /><path d="M12 14h.01" /><path d="M8 14h.01" /><path d="M12 18h.01" /><path d="M8 18h.01" /></svg>
                                        </div>
                                        <span className="text-sm font-medium">{t('gpaCalculator')}</span>
                                    </a>
                                </li>
                            </ul>

                            <div className="mt-8 pt-6 border-t border-border">
                                <p className="text-xs text-zinc-500 text-center leading-relaxed">
                                    {t('quote')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
