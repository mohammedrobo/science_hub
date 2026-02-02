"use client";

import React, { useState, useMemo } from 'react';
import { GraduationCap, ChevronDown } from 'lucide-react';

// --- Types & Constants ---

type Grade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'C+' | 'C' | 'D+' | 'D' | 'D-' | 'F' | 'None';

interface Course {
    id: string;
    name: string;
    credits: number;
    grade: Grade;
}

const GRADE_POINTS: Record<Grade, number> = {
    'A+': 4.0,
    'A': 3.7,
    'A-': 3.4,
    'B+': 2.8,
    'B': 2.5,
    'C+': 2.2,
    'C': 1.9,
    'D+': 1.6,
    'D': 1.3,
    'D-': 1.0,
    'F': 0.0,
    'None': 0.0
};

const INITIAL_TERM_1: Course[] = [
    { id: 't1-1', name: 'Mathematics 1', credits: 3, grade: 'None' },
    { id: 't1-2', name: 'General Physics 1', credits: 2, grade: 'None' },
    { id: 't1-3', name: 'Practical Physics', credits: 1, grade: 'None' },
    { id: 't1-4', name: 'General Chemistry 1', credits: 2, grade: 'None' },
    { id: 't1-5', name: 'Practical Analytical Chemistry', credits: 1, grade: 'None' },
    { id: 't1-6', name: 'General Zoology 1', credits: 1, grade: 'None' },
    { id: 't1-7', name: 'Physical Geology', credits: 2, grade: 'None' },
    { id: 't1-8', name: 'English Language', credits: 2, grade: 'None' },
    { id: 't1-9', name: 'Human Rights', credits: 2, grade: 'None' },
    { id: 't1-10', name: 'Environmental Culture', credits: 2, grade: 'None' },
];

const INITIAL_TERM_2: Course[] = [
    { id: 't2-1', name: 'Mathematics 2', credits: 3, grade: 'None' },
    { id: 't2-2', name: 'General Physics 2', credits: 2, grade: 'None' },
    { id: 't2-3', name: 'Practical Physics 2', credits: 1, grade: 'None' },
    { id: 't2-4', name: 'General Chemistry 2', credits: 2, grade: 'None' },
    { id: 't2-5', name: 'Practical Organic Chemistry', credits: 1, grade: 'None' },
    { id: 't2-6', name: 'Historical Geology', credits: 1, grade: 'None' },
    { id: 't2-7', name: 'General Zoology 2', credits: 2, grade: 'None' },
    { id: 't2-8', name: 'General Botany', credits: 3, grade: 'None' },
    { id: 't2-9', name: 'Intro to Computer', credits: 3, grade: 'None' },
    { id: 't2-10', name: 'Societal Issues', credits: 0, grade: 'None' },
];

// --- Helper Components ---

const GlowingCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`relative group ${className}`}>
        <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-blue-600 rounded-xl opacity-20 group-hover:opacity-40 blur transition duration-500"></div>
        <div className="relative bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-xl">
            {children}
        </div>
    </div>
);

// --- Main Component ---

export function GpaCalculator() {
    const [activeTab, setActiveTab] = useState<'term1' | 'term2'>('term1');
    const [term1Courses, setTerm1Courses] = useState(INITIAL_TERM_1);
    const [term2Courses, setTerm2Courses] = useState(INITIAL_TERM_2);

    const activeCourses = activeTab === 'term1' ? term1Courses : term2Courses;
    const setActiveCourses = activeTab === 'term1' ? setTerm1Courses : setTerm2Courses;

    const handleGradeChange = (id: string, newGrade: Grade) => {
        setActiveCourses(prev => prev.map(c => c.id === id ? { ...c, grade: newGrade } : c));
    };

    // Calculation Logic
    const stats = useMemo(() => {
        let totalPoints = 0;
        let totalCredits = 0;

        activeCourses.forEach(course => {
            if (course.grade !== 'None' && course.credits > 0) {
                totalPoints += GRADE_POINTS[course.grade] * course.credits;
                totalCredits += course.credits;
            }
        });

        const gpa = totalCredits === 0 ? 0 : totalPoints / totalCredits;
        const percentage = totalCredits === 0 ? 0 : ((gpa - 1) / 0.06) + 50;

        return {
            gpa,
            percentage: Math.max(0, percentage),
            totalCredits
        };
    }, [activeCourses]);

    // Grade Color Helper
    const getGradeColor = (grade: Grade) => {
        if (['A+', 'A', 'A-'].includes(grade)) return 'text-violet-400';
        if (['B+', 'B'].includes(grade)) return 'text-blue-400';
        if (['C+', 'C'].includes(grade)) return 'text-emerald-400';
        if (['D+', 'D', 'D-'].includes(grade)) return 'text-amber-400';
        if (grade === 'F') return 'text-red-500';
        return 'text-zinc-500';
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-2 sm:p-4 space-y-6 sm:space-y-8 font-sans">

            {/* Header */}
            <div className="text-center space-y-2 mb-8">
                <div className="inline-flex items-center justify-center p-3 bg-zinc-900/50 rounded-full mb-4 border border-zinc-800 hover:scale-110 transition-transform duration-300">
                    <GraduationCap className="w-8 h-8 text-violet-500" />
                </div>
                <h1 className="text-2xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-zinc-500">
                    System Level Calculator
                </h1>
                <p className="text-zinc-400">Faculty of Science • Credit Hour System</p>
            </div>

            {/* Results Card */}
            <GlowingCard className="mx-auto max-w-2xl hover:scale-[1.01] transition-transform duration-300">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 items-center text-center">
                    {/* Semester GPA */}
                    <div className="space-y-1">
                        <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Semester GPA</p>
                        <div className="text-3xl sm:text-5xl font-black text-white tabular-nums tracking-tight">
                            {stats.gpa.toFixed(2)}
                        </div>
                    </div>

                    {/* Percentage */}
                    <div className="space-y-1 relative">
                        <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Percentage</p>
                        <div className={`text-3xl sm:text-5xl font-black tabular-nums tracking-tight ${stats.percentage >= 50 ? 'text-violet-400' : 'text-zinc-600'}`}>
                            {stats.percentage.toFixed(1)}<span className="text-2xl align-top">%</span>
                        </div>
                        {stats.percentage >= 50 && (
                            <div className="absolute -inset-4 bg-violet-500/10 blur-xl rounded-full -z-10"></div>
                        )}
                    </div>

                    {/* Total Credits */}
                    <div className="hidden md:block space-y-1">
                        <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Credits</p>
                        <div className="text-4xl font-bold text-zinc-300 tabular-nums">
                            {stats.totalCredits}
                        </div>
                    </div>
                </div>
            </GlowingCard>

            {/* Tab Switcher */}
            <div className="flex justify-center">
                <div className="bg-zinc-900 p-1 rounded-xl border border-zinc-800/50">
                    {(['term1', 'term2'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 sm:px-8 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ${activeTab === tab
                                ? 'bg-zinc-800 text-white shadow-lg shadow-black/50'
                                : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            {tab === 'term1' ? 'Term 1 (Year 1)' : 'Term 2 (Year 1)'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Course List */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
                <div className="grid grid-cols-12 bg-zinc-900/50 py-2 sm:py-3 px-2 sm:px-4 text-[10px] sm:text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                    <div className="col-span-6 md:col-span-5">Subject</div>
                    <div className="col-span-2 text-center">Cr</div>
                    <div className="col-span-4 md:col-span-5 text-right pr-2">Grade</div>
                </div>

                <div className="divide-y divide-zinc-900">
                    {activeCourses.map((course) => (
                        <div 
                            key={course.id} 
                            className="grid grid-cols-12 items-center px-2 sm:px-4 py-2 sm:py-3 hover:bg-zinc-900/50 transition-colors duration-200"
                        >
                            {/* Name */}
                            <div className="col-span-6 md:col-span-5 font-medium text-zinc-300 truncate pr-1 sm:pr-2 text-xs sm:text-sm" title={course.name}>
                                {course.name}
                            </div>

                            {/* Credits */}
                            <div className="col-span-2 text-center">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-zinc-900 text-zinc-500 text-xs font-mono">
                                    {course.credits}
                                </span>
                            </div>

                            {/* Grade Dropdown */}
                            <div className="col-span-4 md:col-span-5 flex justify-end">
                                <div className="relative inline-block w-24">
                                    <select
                                        value={course.grade}
                                        onChange={(e) => handleGradeChange(course.id, e.target.value as Grade)}
                                        className={`appearance-none w-full bg-zinc-900 border border-zinc-800 hover:border-violet-500/50 text-right px-3 py-1.5 pr-8 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all font-mono font-bold cursor-pointer ${getGradeColor(course.grade)}`}
                                    >
                                        <option value="None" className="text-zinc-500">-</option>
                                        {Object.keys(GRADE_POINTS).filter(g => g !== 'None').map(g => (
                                            <option key={g} value={g} className="bg-zinc-950 text-zinc-300">
                                                {g}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Note */}
            <div className="text-center text-xs text-zinc-600 mt-8">
                <p>Pass/Fail subjects (Societal Issues) are excluded from calculation automatically.</p>
                <p className="mt-1">"None" assumes the course is not yet graded.</p>
            </div>
        </div>
    );
}
