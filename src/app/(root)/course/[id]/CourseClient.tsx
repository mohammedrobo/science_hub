'use client';

import { COURSE_SUBSECTIONS } from '@/lib/constants';
import { MOCK_COURSES } from '@/lib/data/mocks';
import { useLessonStore } from '@/lib/store/lesson-store';
import { useEffect } from 'react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { PlayCircle, FileText, BrainCircuit, ChevronLeft, Lock, Sparkles, MonitorPlay } from 'lucide-react';
import Link from 'next/link';
import { Course, Lesson } from '@/types';
import { VideoPlayer } from '@/components/courses/VideoPlayer';
import { VideoErrorBoundary } from '@/components/courses/VideoErrorBoundary';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CompleteButton } from '@/components/courses/CompleteButton';

interface CourseClientProps {
    id: string;
    course: Course;
    initialLessons: Lesson[];
    initialProgress: Record<string, { score: number }>;
}

import { logLessonView } from '@/app/tracking/actions';

export default function CourseClient({ id, course, initialLessons, initialProgress }: CourseClientProps) {
    // State
    const [lessons] = useState<Lesson[]>(initialLessons);
    const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
    const [quizProgress] = useState<Record<string, { score: number }>>(initialProgress);

    // Check if this course has sub-sections (e.g., P102 with doctors, C102 with topics)
    const subSectionConfig = COURSE_SUBSECTIONS[id];

    // Global Store Sync
    const { setLessonContext } = useLessonStore();

    useEffect(() => {
        if (currentLesson) {
            setLessonContext({
                courseId: course.code, // P102 etc
                lessonId: currentLesson.id,
                lessonTitle: currentLesson.title,
                pdfUrl: currentLesson.pdf_url,
                videoUrl: currentLesson.video_url || (currentLesson.video_parts?.[0]?.url || null)
            });

            // Log the view
            logLessonView(currentLesson.id, currentLesson.title, course.code);
        }
    }, [currentLesson, course.code, setLessonContext]);



    const isLessonLocked = (index: number) => {
        if (index === 0) return false; // First lesson always unlocked

        const prevLesson = lessons[index - 1];

        if (prevLesson.quiz_id) {
            const progress = quizProgress[prevLesson.quiz_id];
            if (!progress || progress.score < 50) {
                return true;
            }
        }

        return false;
    };

    const handleLessonSelect = (lesson: Lesson, locked: boolean) => {
        if (locked) return;
        if (lesson.video_url || (lesson.video_parts && lesson.video_parts.length > 0)) {
            setCurrentLesson(lesson);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Helper to extract display title (removes [Dr. Name] prefix)
    const getDisplayTitle = (title: string) => {
        return title.replace(/^\[[^\]]+\]\s*/, '');
    };

    // Group lessons by sub-section if applicable
    const getGroupedLessons = () => {
        if (!subSectionConfig) return null;

        const grouped: Record<string, Lesson[]> = {};
        const ungrouped: Lesson[] = [];

        lessons.forEach(lesson => {
            const match = lesson.title.match(/^\[([^\]]+)\]\s*/);
            if (match) {
                const prefix = match[1];
                const option = subSectionConfig.options.find(o => o.name === prefix);
                if (option) {
                    if (!grouped[option.id]) grouped[option.id] = [];
                    grouped[option.id].push(lesson);
                } else {
                    ungrouped.push(lesson);
                }
            } else {
                ungrouped.push(lesson);
            }
        });

        return { grouped, ungrouped };
    };

    // Render a single lesson accordion item
    const renderLessonItem = (lesson: Lesson, displayTitle: string, index: number, isActive: boolean, locked: boolean) => (
        <AccordionItem
            key={lesson.id}
            value={lesson.id}
            className={cn(
                "border rounded-lg overflow-hidden transition-all duration-300",
                isActive
                    ? "border-primary/50 bg-primary/5 shadow-[0_0_15px_-5px_rgba(139,92,246,0.3)]"
                    : locked
                        ? "border-zinc-800/50 bg-zinc-900/20 opacity-75"
                        : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
            )}
        >
            <AccordionTrigger
                className={cn("py-4 px-4 group hover:no-underline", locked && "cursor-not-allowed")}
                disabled={locked}
            >
                <div className="flex items-center gap-4 w-full">
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!locked) handleLessonSelect(lesson, locked);
                        }}
                        className={cn(
                            "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer",
                            isActive
                                ? "bg-primary text-white shadow-lg scale-110"
                                : locked
                                    ? "bg-zinc-900 text-zinc-600 border border-zinc-800"
                                    : "bg-zinc-800 text-zinc-400 group-hover:bg-primary/20 group-hover:text-primary"
                        )}
                    >
                        {locked ? <Lock className="w-4 h-4" /> : isActive ? <PlayCircle className="w-5 h-5 fill-current" /> : <span className="font-bold text-sm">{index + 1}</span>}
                    </div>

                    <div className="flex-1 text-left">
                        <h4 className={cn(
                            "font-medium text-base transition-colors",
                            isActive ? "text-primary font-bold" : locked ? "text-zinc-500" : "text-zinc-200 group-hover:text-white"
                        )}>
                            {displayTitle}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {locked ? (
                                <span className="text-red-500/80 flex items-center gap-1 font-medium bg-red-500/10 px-2 py-0.5 rounded text-[10px] sm:text-xs">
                                    <Lock className="w-3 h-3" />
                                    {index > 0 && lessons[index - 1].quiz_id
                                        ? `Score 50%+ on "${getDisplayTitle(lessons[index - 1].title)}" Quiz to Unlock`
                                        : "Complete previous lesson to unlock"}
                                </span>
                            ) : (
                                <>
                                    {(lesson.video_url || (lesson.video_parts && lesson.video_parts.length > 0)) && <span className="flex items-center gap-1"><PlayCircle className="w-3 h-3" /> Video</span>}
                                    {lesson.pdf_url && <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> PDF Resources</span>}
                                    {lesson.quiz_id && <span className="flex items-center gap-1"><BrainCircuit className="w-3 h-3" /> Quiz</span>}
                                </>
                            )}
                        </div>
                    </div>

                    {isActive && (
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded animate-pulse">
                            PLAYING
                        </span>
                    )}
                </div>
            </AccordionTrigger>

            <AccordionContent className="px-4 pb-4 pt-0">
                {!locked && (
                    <div className="pl-[3.5rem] pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {lesson.video_url || (lesson.video_parts && lesson.video_parts.length > 0) ? (
                            <Button
                                onClick={() => handleLessonSelect(lesson, false)}
                                variant={isActive ? "default" : "secondary"}
                                className={cn(
                                    "h-10 justify-start",
                                    isActive ? "bg-primary hover:bg-primary/90" : "bg-zinc-800 hover:bg-zinc-700"
                                )}
                            >
                                <PlayCircle className="mr-2 h-4 w-4" />
                                {isActive ? "Replay Video" : "Play Video"}
                            </Button>
                        ) : (
                            <Button disabled variant="outline" className="h-10 justify-start border-zinc-800 opacity-50">
                                <Lock className="mr-2 h-4 w-4" /> Video Locked
                            </Button>
                        )}

                        <div className="flex gap-2">
                            <CompleteButton lessonId={lesson.id} />

                            {lesson.pdf_url && (
                                <Button variant="outline" size="icon" className="h-10 w-10 border-zinc-700 hover:border-violet-500 hover:text-violet-500" asChild>
                                    <a href={lesson.pdf_url} target="_blank" rel="noopener noreferrer" title="View PDF">
                                        <FileText className="h-4 w-4" />
                                    </a>
                                </Button>
                            )}
                            {lesson.quiz_id && (
                                <Button variant="outline" size="icon" className="h-10 w-10 border-zinc-700 hover:border-green-500 hover:text-green-500" asChild>
                                    <Link href={`/quiz/${lesson.quiz_id}`} title="Take Quiz">
                                        <BrainCircuit className="h-4 w-4" />
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </AccordionContent>
        </AccordionItem>
    );

    const groupedData = getGroupedLessons();

    return (
        <div className="min-h-screen bg-background">
            {/* Top Section: The Stage (Master Player) - Sticky on mobile */}
            <div className="w-full bg-zinc-950 border-b border-zinc-800 relative z-30 shadow-2xl sticky top-0 lg:relative">
                <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-6 max-w-6xl">
                    {/* Back button */}
                    <div className="hidden sm:block mb-4">
                        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group">
                            <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                            Back to Hub
                        </Link>
                    </div>

                    {/* Video Player */}
                    <div className="aspect-video w-full bg-black rounded-lg sm:rounded-xl overflow-hidden shadow-[0_0_50px_-10px_rgba(139,92,246,0.15)] border border-white/10 relative">
                        {currentLesson?.video_url || (currentLesson?.video_parts && currentLesson.video_parts.length > 0) ? (
                            <VideoErrorBoundary videoUrl={currentLesson.video_url}>
                                <VideoPlayer
                                    url={currentLesson.video_url}
                                    title={currentLesson.title}
                                    parts={currentLesson.video_parts}
                                />
                            </VideoErrorBoundary>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-black p-8 text-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05]" />
                                <div
                                    className="relative z-10 max-w-lg"
                                    style={{ animation: 'scaleIn 0.5s ease-out forwards' }}
                                >
                                    <MonitorPlay className="w-20 h-20 text-primary/50 mx-auto mb-6" />
                                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">{course.name}</h2>
                                    <p className="text-zinc-400 mb-8">{course.description}</p>
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium animate-pulse">
                                        <Sparkles className="w-4 h-4" />
                                        Select a lecture below to begin transmission
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-lg sm:text-2xl font-bold text-white mb-1">
                                {currentLesson ? getDisplayTitle(currentLesson.title) : "Ready to Start"}
                            </h3>
                            <p className="text-muted-foreground text-sm">
                                {currentLesson ? `Now Playing • Mission ${currentLesson.order_index + 1}` : "Select a mission to begin"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: The List (Detail) */}
            <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-12 max-w-4xl">
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_10px_var(--color-primary)]"></span>
                            COURSE CONTENT
                        </h2>
                        <span className="text-sm text-muted-foreground bg-zinc-900 px-3 py-1 rounded-md border border-zinc-800">
                            {lessons.length} Lectures
                        </span>
                    </div>

                    <div className="space-y-6">
                        {lessons.length === 0 ? (
                            <div className="text-center py-12 border border-zinc-800 rounded-lg bg-zinc-900/50">
                                <p className="text-muted-foreground">No lectures visible.</p>
                            </div>
                        ) : groupedData ? (
                            // Grouped by sub-section (e.g., by doctor or topic)
                            <>
                                {subSectionConfig!.options.map(option => {
                                    const sectionLessons = groupedData.grouped[option.id] || [];
                                    if (sectionLessons.length === 0) return null;

                                    return (
                                        <div key={option.id} className="space-y-3">
                                            {/* Section Header */}
                                            <div className="flex items-center gap-3 py-2 px-4 bg-gradient-to-r from-violet-600/20 to-transparent rounded-lg border-l-4 border-violet-500">
                                                <span className="text-lg font-bold text-white">{option.name}</span>
                                                <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                                                    {sectionLessons.length} {sectionLessons.length === 1 ? 'Lecture' : 'Lectures'}
                                                </span>
                                            </div>

                                            <Accordion type="single" collapsible className="w-full space-y-3">
                                                {sectionLessons.map((lesson) => {
                                                    const globalIndex = lessons.findIndex(l => l.id === lesson.id);
                                                    const isActive = currentLesson?.id === lesson.id;
                                                    const locked = isLessonLocked(globalIndex);
                                                    return renderLessonItem(lesson, getDisplayTitle(lesson.title), globalIndex, isActive, locked);
                                                })}
                                            </Accordion>
                                        </div>
                                    );
                                })}

                                {/* Ungrouped lessons (if any) */}
                                {groupedData.ungrouped.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 py-2 px-4 bg-gradient-to-r from-zinc-600/20 to-transparent rounded-lg border-l-4 border-zinc-500">
                                            <span className="text-lg font-bold text-white">Other Lectures</span>
                                        </div>
                                        <Accordion type="single" collapsible className="w-full space-y-3">
                                            {groupedData.ungrouped.map((lesson) => {
                                                const globalIndex = lessons.findIndex(l => l.id === lesson.id);
                                                const isActive = currentLesson?.id === lesson.id;
                                                const locked = isLessonLocked(globalIndex);
                                                return renderLessonItem(lesson, lesson.title, globalIndex, isActive, locked);
                                            })}
                                        </Accordion>
                                    </div>
                                )}
                            </>
                        ) : (
                            // Default flat list (no sub-sections)
                            <Accordion type="single" collapsible className="w-full space-y-3">
                                {lessons.map((lesson, index) => {
                                    const isActive = currentLesson?.id === lesson.id;
                                    const locked = isLessonLocked(index);
                                    return renderLessonItem(lesson, lesson.title, index, isActive, locked);
                                })}
                            </Accordion>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
