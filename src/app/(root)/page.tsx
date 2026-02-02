'use client';
import { useState, useEffect, useRef } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence, Variants, useReducedMotion } from 'framer-motion';

import { useSemesterStore } from '@/stores/semester-store';
import { CourseGrid } from '@/components/courses/CourseGrid';
import { MOCK_COURSES } from '@/lib/constants';
import { getCourseProgress } from '@/app/actions/progress';

export default function Dashboard() {
    const [progress, setProgress] = useState<Record<string, number>>({});
    const prefersReducedMotion = useReducedMotion();

    useEffect(() => {
        getCourseProgress().then(setProgress);
    }, []);

    const { semester, hasHydrated } = useSemesterStore();
    const filteredCourses = MOCK_COURSES.filter(c => c.semester === semester);

    // Animation settings - respect reduced motion
    const duration = prefersReducedMotion ? 0 : 0.4;
    const stagger = prefersReducedMotion ? 0 : 0.08;

    // Hero section variants
    const heroVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: duration * 0.75, ease: "easeOut" }
        }
    };

    // Stagger container for page sections
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: stagger,
                delayChildren: 0.1
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 16 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration, ease: "easeOut" }
        }
    };

    // Term switch animation variants
    const termSwitchVariants: Variants = {
        enter: (dir: number) => ({
            x: dir > 0 ? 40 : -40,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1,
            transition: { duration: 0.3, ease: "easeOut" }
        },
        exit: (dir: number) => ({
            x: dir > 0 ? -40 : 40,
            opacity: 0,
            transition: { duration: 0.2, ease: "easeIn" }
        })
    };

    // Track direction synchronously using ref
    const prevSemesterRef = useRef(semester);
    const direction = semester > prevSemesterRef.current ? 1 : -1;

    // Update ref after direction is calculated
    useEffect(() => {
        prevSemesterRef.current = semester;
    }, [semester]);

    if (!hasHydrated) return null;

    return (
        <LazyMotion features={domAnimation}>
            <m.div
                className="flex-1 w-full relative"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
            {/* Atmospheric Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-900/20 blur-[120px] rounded-full pointer-events-none -z-10" />

            {/* Hero Section - Comprehensive Welcome */}
            <m.div
                className="bg-card/80 border-b border-border mb-8 sm:mb-12"
                variants={heroVariants}
            >
                <div className="container mx-auto px-4 py-10 sm:py-14">
                    <m.h1
                        className="text-3xl sm:text-5xl font-bold text-zinc-100 mb-4 tracking-tight"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: duration * 0.6, ease: "easeOut" }}
                    >
                        Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">Science Hub</span>
                    </m.h1>

                    <m.p
                        className="text-base sm:text-lg text-zinc-400 max-w-3xl leading-relaxed mb-6"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: duration * 0.6, delay: 0.1, ease: "easeOut" }}
                    >
                        Your complete learning platform for first-year science studies. Access organized course materials,
                        video lectures, interactive quizzes, and track your academic progress — all in one place.
                    </m.p>

                    {/* Features Grid */}
                    <m.div
                        className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: duration * 0.6, delay: 0.2, ease: "easeOut" }}
                    >
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-sm p-3 sm:p-4">
                            <div className="text-violet-400 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect width="15" height="14" x="1" y="5" rx="2" ry="2" /></svg>
                            </div>
                            <h3 className="text-sm font-semibold text-zinc-200">Video Lectures</h3>
                            <p className="text-xs text-zinc-500 mt-1">Watch organized lecture videos for each chapter</p>
                        </div>
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-sm p-3 sm:p-4">
                            <div className="text-violet-400 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>
                            </div>
                            <h3 className="text-sm font-semibold text-zinc-200">Interactive Quizzes</h3>
                            <p className="text-xs text-zinc-500 mt-1">Test your knowledge with chapter quizzes</p>
                        </div>
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-sm p-3 sm:p-4">
                            <div className="text-violet-400 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
                            </div>
                            <h3 className="text-sm font-semibold text-zinc-200">Progress Tracking</h3>
                            <p className="text-xs text-zinc-500 mt-1">Track your completion across all courses</p>
                        </div>
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-sm p-3 sm:p-4">
                            <div className="text-violet-400 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><line x1="16" x2="16" y1="14" y2="18" /><path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" /><path d="M12 14h.01" /><path d="M8 14h.01" /><path d="M12 18h.01" /><path d="M8 18h.01" /></svg>
                            </div>
                            <h3 className="text-sm font-semibold text-zinc-200">GPA Calculator</h3>
                            <p className="text-xs text-zinc-500 mt-1">Calculate your academic GPA easily</p>
                        </div>
                    </m.div>

                    {/* Term Status */}
                    <m.div
                        className="flex flex-wrap items-center gap-3 text-sm"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: duration * 0.6, delay: 0.3, ease: "easeOut" }}
                    >
                        <span className="text-zinc-500">Current view:</span>
                        <span className="font-semibold text-violet-400">Term {semester}</span>
                        <span className="text-zinc-600">•</span>
                        {semester === 1 ? (
                            <span className="text-red-400 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                Term 1 courses are closed (archived)
                            </span>
                        ) : (
                            <span className="text-emerald-400 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                Term 2 courses are active — start learning!
                            </span>
                        )}
                    </m.div>
                </div>
            </m.div>

            <div className="container mx-auto px-4 pb-20">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Main Content: Course Grid */}
                    <div className="lg:col-span-3">
                        <m.div
                            className="flex items-center justify-between mb-6"
                            variants={itemVariants}
                        >
                            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                <span className="w-1 h-8 bg-violet-500 rounded-full inline-block shadow-[0_0_10px_rgba(139,92,246,0.5)]"></span>
                                Current Modules
                            </h2>
                            <span className="text-sm text-zinc-500 italic">Showing {filteredCourses.length} courses</span>
                        </m.div>

                        {/* Term Switch with AnimatePresence - slide left/right based on direction */}
                        <AnimatePresence mode="wait" custom={direction}>
                            <m.div
                                key={semester}
                                custom={direction}
                                variants={prefersReducedMotion ? undefined : termSwitchVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                            >
                                <CourseGrid courses={filteredCourses} progress={progress} />
                            </m.div>
                        </AnimatePresence>
                    </div>

                    {/* Sidebar: Academic Tools with entrance animation */}
                    <m.div
                        className="lg:col-span-1 space-y-6"
                        variants={itemVariants}
                    >
                        <m.div
                            className="bg-card/95 p-6 rounded-sm border border-border shadow-sm sticky top-24"
                            whileHover={{ scale: 1.01 }}
                            transition={{ duration: 0.2 }}
                        >
                            <h3 className="font-bold text-lg text-violet-400 mb-4 pb-2 border-b border-border">
                                Academic Tools
                            </h3>
                            <ul className="space-y-3">
                                <li>
                                    <m.a
                                        href="/tools/gpa"
                                        className="flex items-center gap-3 text-zinc-400 hover:text-violet-300 transition-colors group"
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="p-2 bg-zinc-900 text-zinc-500 group-hover:bg-violet-900/20 group-hover:text-violet-400 rounded transition-colors border border-zinc-800">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><line x1="16" x2="16" y1="14" y2="18" /><path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" /><path d="M12 14h.01" /><path d="M8 14h.01" /><path d="M12 18h.01" /><path d="M8 18h.01" /></svg>
                                        </div>
                                        <span className="text-sm font-medium">GPA Calculator</span>
                                    </m.a>
                                </li>
                            </ul>

                            <div className="mt-8 pt-6 border-t border-border">
                                <p className="text-xs text-zinc-500 text-center leading-relaxed">
                                    "Knowledge is the premise of freedom."
                                </p>
                            </div>
                        </m.div>
                    </m.div>
                </div>
            </div>
            </m.div>
        </LazyMotion>
    );
}
