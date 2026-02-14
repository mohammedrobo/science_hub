'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { completeOnboarding } from './submit-onboarding';
import { 
    Sparkles, Trophy, BookOpen, Brain, Target, Users, 
    Zap, Star, ChevronRight, ChevronLeft, Rocket,
    GraduationCap, Medal, Flame, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ONBOARDING_STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to Science Hub! 🎉',
        subtitle: 'Your Academic Journey Begins Here',
        content: (
            <div className="space-y-4 text-center">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/25">
                    <Rocket className="w-10 h-10 text-white" />
                </div>
                <p className="text-zinc-300 text-lg leading-relaxed">
                    Science Hub is your <strong className="text-violet-400">all-in-one academic companion</strong> designed 
                    specifically for science students like you.
                </p>
                <div className="grid grid-cols-2 gap-3 mt-6">
                    <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                        <BookOpen className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                        <span className="text-sm text-zinc-400">Video Lessons</span>
                    </div>
                    <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                        <Brain className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                        <span className="text-sm text-zinc-400">Smart Quizzes</span>
                    </div>
                    <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                        <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                        <span className="text-sm text-zinc-400">Leaderboard</span>
                    </div>
                    <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                        <Target className="w-6 h-6 text-red-400 mx-auto mb-2" />
                        <span className="text-sm text-zinc-400">Progress Tracking</span>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'ranking',
        title: 'The Ranking System 🏆',
        subtitle: 'Rise Through the Ranks',
        content: (
            <div className="space-y-4">
                <p className="text-zinc-300 text-center">
                    Inspired by <strong className="text-violet-400">Solo Leveling</strong>, your academic progress 
                    is represented by ranks. Start as an <strong className="text-zinc-400">E-Rank</strong> and climb to <strong className="text-amber-400">SSS-Rank</strong>!
                </p>
                <div className="space-y-2 mt-4">
                    {[
                        { rank: 'SSS', xp: '10,000+', color: 'from-amber-400 to-orange-500', icon: '👑' },
                        { rank: 'SS', xp: '7,500', color: 'from-red-400 to-pink-500', icon: '🔥' },
                        { rank: 'S', xp: '5,000', color: 'from-violet-400 to-purple-500', icon: '⚡' },
                        { rank: 'A', xp: '3,000', color: 'from-blue-400 to-cyan-500', icon: '💎' },
                        { rank: 'B', xp: '1,500', color: 'from-emerald-400 to-green-500', icon: '🌟' },
                        { rank: 'C', xp: '750', color: 'from-yellow-400 to-amber-500', icon: '✨' },
                        { rank: 'D', xp: '300', color: 'from-orange-400 to-red-400', icon: '🎯' },
                        { rank: 'E', xp: '0', color: 'from-zinc-400 to-zinc-500', icon: '🌱' },
                    ].map((r, i) => (
                        <div key={r.rank} className={cn(
                            "flex items-center justify-between p-2 rounded-lg border transition-all",
                            i === 7 ? "bg-zinc-800/80 border-violet-500/50 ring-1 ring-violet-500/30" : "bg-zinc-800/30 border-zinc-700/50"
                        )}>
                            <div className="flex items-center gap-3">
                                <span className="text-lg">{r.icon}</span>
                                <span className={cn(
                                    "font-bold bg-gradient-to-r bg-clip-text text-transparent",
                                    r.color
                                )}>{r.rank}-Rank</span>
                            </div>
                            <span className="text-xs text-zinc-500">{r.xp} XP</span>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-zinc-500 text-center mt-2">
                    You start at E-Rank. Complete lessons and quizzes to earn XP!
                </p>
            </div>
        )
    },
    {
        id: 'xp',
        title: 'Earning XP ⚡',
        subtitle: 'Every Action Counts',
        content: (
            <div className="space-y-4">
                <p className="text-zinc-300 text-center">
                    XP (Experience Points) is earned by engaging with course content. Here's how:
                </p>
                <div className="space-y-3 mt-4">
                    <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-blue-500/10 to-transparent rounded-lg border border-blue-500/20">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-white">Complete a Lesson</p>
                            <p className="text-sm text-zinc-400">Watch videos & read materials</p>
                        </div>
                        <span className="text-blue-400 font-bold">+10 XP</span>
                    </div>
                    <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-emerald-500/10 to-transparent rounded-lg border border-emerald-500/20">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <Brain className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-white">Pass a Quiz (50%+)</p>
                            <p className="text-sm text-zinc-400">Test your knowledge</p>
                        </div>
                        <span className="text-emerald-400 font-bold">+25 XP</span>
                    </div>
                    <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-amber-500/10 to-transparent rounded-lg border border-amber-500/20">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                            <Star className="w-6 h-6 text-amber-400" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-white">Perfect Quiz Score</p>
                            <p className="text-sm text-zinc-400">Score 100% on any quiz</p>
                        </div>
                        <span className="text-amber-400 font-bold">+50 XP</span>
                    </div>
                    <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-violet-500/10 to-transparent rounded-lg border border-violet-500/20">
                        <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                            <Flame className="w-6 h-6 text-violet-400" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-white">Daily Streak Bonus</p>
                            <p className="text-sm text-zinc-400">Login & study daily</p>
                        </div>
                        <span className="text-violet-400 font-bold">+5 XP/day</span>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'leaderboard',
        title: 'Compete & Climb 📊',
        subtitle: 'Leaderboard & Competition',
        content: (
            <div className="space-y-4">
                <p className="text-zinc-300 text-center">
                    See how you stack up against your classmates! The leaderboard shows:
                </p>
                <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 overflow-hidden mt-4">
                    <div className="p-3 bg-zinc-800 border-b border-zinc-700">
                        <span className="text-sm font-medium text-zinc-400">🏆 Top Performers</span>
                    </div>
                    <div className="p-2 space-y-2">
                        {[
                            { pos: 1, name: 'You could be here!', xp: '???', rank: 'S', medal: '🥇' },
                            { pos: 2, name: 'Top Student', xp: '4,850', rank: 'A', medal: '🥈' },
                            { pos: 3, name: 'Rising Star', xp: '3,200', rank: 'A', medal: '🥉' },
                        ].map(p => (
                            <div key={p.pos} className={cn(
                                "flex items-center gap-3 p-2 rounded-lg",
                                p.pos === 1 ? "bg-violet-500/10 border border-violet-500/30" : "bg-zinc-800/30"
                            )}>
                                <span className="text-xl">{p.medal}</span>
                                <div className="flex-1">
                                    <p className={cn(
                                        "font-medium",
                                        p.pos === 1 ? "text-violet-300" : "text-zinc-300"
                                    )}>{p.name}</p>
                                </div>
                                <span className="text-xs px-2 py-1 rounded bg-zinc-700 text-zinc-300">{p.rank}</span>
                                <span className="text-sm text-zinc-400">{p.xp} XP</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 mt-4">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <p className="text-sm text-zinc-300">
                        Compete with students from <strong className="text-emerald-400">your section</strong> and 
                        across the <strong className="text-emerald-400">entire faculty</strong>!
                    </p>
                </div>
            </div>
        )
    },
    {
        id: 'features',
        title: 'More Features 🛠️',
        subtitle: 'Everything You Need',
        content: (
            <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <p className="font-medium text-white">Course Materials</p>
                        <p className="text-sm text-zinc-400">Access all semester courses with videos, PDFs, and notes</p>
                    </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                    <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                        <Brain className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <p className="font-medium text-white">Interactive Quizzes</p>
                        <p className="text-sm text-zinc-400">Test your knowledge with quizzes for every course</p>
                    </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <Target className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <p className="font-medium text-white">GPA Calculator</p>
                        <p className="text-sm text-zinc-400">Track and predict your academic performance</p>
                    </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                        <Shield className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <p className="font-medium text-white">Secure & Private</p>
                        <p className="text-sm text-zinc-400">Your data is encrypted and only you can access it</p>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'ready',
        title: "You're Ready! 🚀",
        subtitle: 'Start Your Journey',
        content: (
            <div className="space-y-6 text-center">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <Sparkles className="w-12 h-12 text-white" />
                </div>
                <div className="space-y-2">
                    <p className="text-xl text-white font-semibold">
                        Welcome, Hunter! 🎮
                    </p>
                    <p className="text-zinc-400">
                        Your academic adventure begins now. Complete lessons, ace quizzes, 
                        and climb the ranks to become the top student!
                    </p>
                </div>
                <div className="p-4 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-pink-500/10 rounded-xl border border-violet-500/20">
                    <p className="text-sm text-violet-300">
                        💡 <strong>Pro Tip:</strong> Start with the first lesson of any course. 
                        You need to complete lessons in order to unlock the next ones!
                    </p>
                </div>
            </div>
        )
    }
];

export default function OnboardingPage() {
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    const handleComplete = async () => {
        setLoading(true);

        try {
            const result = await completeOnboarding();

            if (result.error) {
                toast.error(result.error);
                setLoading(false);
            } else {
                toast.success("Welcome to Science Hub! Let's go! 🚀");
                window.location.href = '/';
            }
        } catch (err: any) {
            console.error("Client Submission Error:", err);
            toast.error(`System Error: ${err.message || "Unknown error"}`);
            setLoading(false);
        }
    };

    const step = ONBOARDING_STEPS[currentStep];
    const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
    const isFirstStep = currentStep === 0;

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-violet-500/10 via-transparent to-emerald-500/10" />
            
            {/* Animated orbs */}
            <div className="absolute top-20 left-20 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

            <div className="w-full max-w-lg relative z-10">
                {/* Progress indicators */}
                <div className="flex justify-center gap-2 mb-6">
                    {ONBOARDING_STEPS.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentStep(i)}
                            className={cn(
                                "w-2 h-2 rounded-full transition-all duration-300",
                                i === currentStep 
                                    ? "w-8 bg-violet-500" 
                                    : i < currentStep 
                                        ? "bg-emerald-500" 
                                        : "bg-zinc-700"
                            )}
                        />
                    ))}
                </div>

                <Card className="bg-zinc-900/90 backdrop-blur-xl border-zinc-800 shadow-2xl">
                    <CardHeader className="text-center pb-2 pt-6">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-violet-200 to-white bg-clip-text text-transparent">
                            {step.title}
                        </h1>
                        <p className="text-zinc-500 text-sm mt-1">
                            {step.subtitle}
                        </p>
                    </CardHeader>

                    <CardContent className="pt-4 pb-2 min-h-[380px]">
                        {step.content}
                    </CardContent>

                    <CardFooter className="flex gap-3 pt-4 pb-6">
                        {!isFirstStep && (
                            <Button
                                variant="outline"
                                onClick={() => setCurrentStep(s => s - 1)}
                                className="flex-1 border-zinc-700 hover:bg-zinc-800"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Back
                            </Button>
                        )}
                        
                        {isLastStep ? (
                            <Button
                                onClick={handleComplete}
                                disabled={loading}
                                className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98]"
                            >
                                {loading ? (
                                    <>
                                        <Zap className="w-4 h-4 mr-2 animate-pulse" />
                                        Starting...
                                    </>
                                ) : (
                                    <>
                                        <Rocket className="w-4 h-4 mr-2" />
                                        Start My Journey!
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button
                                onClick={() => setCurrentStep(s => s + 1)}
                                className={cn(
                                    "flex-1 bg-violet-600 hover:bg-violet-500 text-white font-semibold",
                                    isFirstStep && "w-full"
                                )}
                            >
                                Next
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        )}
                    </CardFooter>
                </Card>

                {/* Skip option */}
                {!isLastStep && (
                    <button 
                        onClick={() => setCurrentStep(ONBOARDING_STEPS.length - 1)}
                        className="w-full mt-4 text-zinc-500 hover:text-zinc-400 text-sm transition-colors"
                    >
                        Skip introduction →
                    </button>
                )}
            </div>
        </div>
    );
}
