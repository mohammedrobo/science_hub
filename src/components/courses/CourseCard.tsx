'use client';

import { Course } from '@/types';
import { Book, ChevronRight, Lock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface CourseCardProps {
    course: Course;
    progress?: number;
}

export function CourseCard({ course, progress = 0 }: CourseCardProps) {
    const isComplete = progress >= 100;
    const t = useTranslations('courses');

    // Term 1 courses (semester 1) are closed/locked
    const isClosed = course.semester === 1;

    // Animate progress bar from 0 to actual value
    const [animatedProgress, setAnimatedProgress] = useState(0);

    useEffect(() => {
        // Immediate progress update
        setAnimatedProgress(progress);
    }, [progress]);

    const cardContent = (
        <div
            className={cn(
                "group h-full relative will-change-transform",
                isClosed && "cursor-not-allowed",
                !isClosed && "cursor-pointer active:opacity-90",
                "transition-opacity duration-100"
            )}
        >
            {/* Glow Effect Layer - appears on hover (only for open courses) */}
            {!isClosed && (
                <div
                    className="absolute -inset-1 bg-gradient-to-br from-violet-600/20 to-indigo-600/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-100 blur-sm"
                    aria-hidden="true"
                />
            )}

            <div className={cn(
                "h-full flex flex-col bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/60 rounded-xl overflow-hidden relative z-10",
                "transition-all duration-200",
                isClosed
                    ? "opacity-70 grayscale-[40%]"
                    : "group-hover:border-violet-500/40 group-hover:shadow-lg group-hover:shadow-violet-900/25"
            )}>
                {/* Course Code Badge */}
                <div className={cn(
                    "absolute top-0 start-0 text-white text-[10px] font-bold px-3 py-1 rounded-br-lg z-20 tracking-wider shadow-sm",
                    isClosed ? "bg-zinc-600 shadow-zinc-900/20" : "bg-gradient-to-r from-violet-600 to-indigo-600 shadow-violet-900/30"
                )}>
                    {course.code}
                </div>

                {/* Closed Badge */}
                {isClosed && (
                    <div className="absolute top-0 end-0 bg-red-600/90 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg z-20 tracking-wider flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        {t('closed')}
                    </div>
                )}

                <div className="relative h-36 overflow-hidden bg-zinc-950/50 border-b border-border">
                    {course.image_url ? (
                        <Image
                            src={course.image_url}
                            alt={course.name}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className={cn(
                                "object-cover transition-opacity duration-150 ease-out",
                                isClosed
                                    ? "grayscale-[60%] opacity-60"
                                    : cn(
                                        "grayscale-0 opacity-100",
                                        "[@media(hover:hover)]:grayscale-[30%] [@media(hover:hover)]:opacity-90",
                                        "[@media(hover:hover)]:group-hover:grayscale-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-hover:scale-105"
                                    )
                            )}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-950/50 text-violet-500/20">
                            <Book className="h-12 w-12" />
                        </div>
                    )}

                    {/* Overlay - subtle scrim */}
                    <div className={cn(
                        "absolute inset-0 transition-all duration-300",
                        "bg-gradient-to-t from-zinc-900/70 via-transparent to-transparent",
                        !isClosed && "group-hover:from-zinc-900/50"
                    )} />
                </div>

                <div className="p-5 flex-1 flex flex-col">
                    <h3 className={cn(
                        "font-bold text-lg leading-tight mb-2 transition-colors duration-300 line-clamp-2",
                        isClosed
                            ? "text-zinc-400"
                            : "text-zinc-100 group-hover:text-violet-300"
                    )}>
                        {course.name}
                    </h3>

                    <p className="text-sm text-zinc-400 line-clamp-3 mb-4 flex-1">
                        {course.description || t('syllabusDefault')}
                    </p>

                    <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                        {isClosed ? (
                            <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                {t('closedLower')}
                            </span>
                        ) : (
                            <span className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1">
                                {progress === 0 && t('startCourse')}
                                {progress > 0 && progress < 100 && t('continue')}
                                {progress >= 100 && t('reviewCourse')}
                                <ChevronRight className="h-3 w-3" />
                            </span>
                        )}

                        {!isClosed && (
                            <span
                                className={cn(
                                    "text-xs font-mono font-medium",
                                    isComplete ? "text-emerald-400" : "text-zinc-500"
                                )}
                            >
                                {progress}%
                            </span>
                        )}
                    </div>
                </div>

                {/* Animated Progress Bar - only show for open courses */}
                {!isClosed && (
                    <div className="h-1 bg-zinc-950 w-full mt-auto relative overflow-hidden">
                        <div
                            className="h-full w-full bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 transition-transform duration-300 ease-out origin-left"
                            style={{ transform: `scaleX(${animatedProgress / 100})` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );

    // For closed courses, render without link
    if (isClosed) {
        return <div className="block h-full">{cardContent}</div>;
    }

    return (
        <Link href={`/course/${course.id}`} className="block h-full">
            {cardContent}
        </Link>
    );
}
