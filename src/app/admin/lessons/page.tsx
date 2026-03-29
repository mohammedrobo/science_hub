'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getLessons, deleteLesson, toggleLessonPublishStatus } from '../actions';
import {
    ArrowLeft, Trash2, Edit, Video, FileText, BrainCircuit,
    Loader2, AlertCircle, CheckCircle, BookOpen, ChevronDown, ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';

interface Lesson {
    id: string;
    title: string;
    video_url: string | null;
    pdf_url: string | null;
    quiz_id: string | null;
    order_index: number;
    created_at: string;
    is_published?: boolean;
    course: { id: string; name: string; code: string } | { id: string; name: string; code: string }[] | null;
}

interface CourseGroup {
    code: string;
    name: string;
    lessons: Lesson[];
}

export default function LessonsPage() {
    const t = useTranslations('lessons');
    const tc = useTranslations('common');
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
    const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

    // Helper to normalize course (handles array from Supabase join)
    const getCourse = (lesson: Lesson) => {
        if (!lesson.course) return null;
        return Array.isArray(lesson.course) ? lesson.course[0] : lesson.course;
    };

    const fetchLessons = async () => {
        setLoading(true);
        const res = await getLessons();
        if (res.error) {
            setError(res.error);
        } else {
            const fetchedLessons = (res.lessons || []) as Lesson[];
            setLessons(fetchedLessons);
            // Auto-expand all courses on load
            const courseIds = new Set(fetchedLessons.map(l => getCourse(l)?.code).filter(Boolean) as string[]);
            setExpandedCourses(courseIds);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLessons();
    }, []);

    const handleDelete = async (lessonId: string, lessonTitle: string) => {
        if (!confirm(t('deleteConfirm', { title: lessonTitle }))) {
            return;
        }

        setDeletingId(lessonId);
        setResult(null);

        const res = await deleteLesson(lessonId);

        if (res.error) {
            setResult({ error: res.error });
        } else {
            setResult({ success: true, message: res.message });
            setLessons(prev => prev.filter(l => l.id !== lessonId));
        }

        setDeletingId(null);
    };

    const handleTogglePublish = async (lessonId: string, currentStatus: boolean, title: string) => {
        setTogglingId(lessonId);
        setResult(null);
        const res = await toggleLessonPublishStatus(lessonId, currentStatus);
        if (res.error) {
            setResult({ error: res.error });
        } else {
            setResult({ success: true, message: res.message });
            setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, is_published: !currentStatus } : l));
        }
        setTogglingId(null);
    };

    const toggleCourse = (code: string) => {
        setExpandedCourses(prev => {
            const next = new Set(prev);
            if (next.has(code)) {
                next.delete(code);
            } else {
                next.add(code);
            }
            return next;
        });
    };

    // Group lessons by course
    const groupedLessons: CourseGroup[] = [];
    const courseMap = new Map<string, CourseGroup>();

    lessons.forEach(lesson => {
        const course = getCourse(lesson);
        const code = course?.code || 'Unknown';
        const name = course?.name || 'Uncategorized';

        if (!courseMap.has(code)) {
            courseMap.set(code, { code, name, lessons: [] });
        }
        courseMap.get(code)!.lessons.push(lesson);
    });

    // Sort courses by code
    Array.from(courseMap.values())
        .sort((a, b) => a.code.localeCompare(b.code))
        .forEach(group => groupedLessons.push(group));

    return (
        <div className="min-h-screen bg-zinc-950">
            {/* Header - Simple back navigation */}
            <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
                <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/leader" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                            <span className="font-medium text-sm sm:text-base">{tc('back')}</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl">
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent flex items-center gap-2 sm:gap-3">
                        <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
                        {t('title')}
                    </h1>
                    <p className="text-zinc-500 mt-1 text-sm sm:text-base">{t('noLessonsDesc').replace('Upload your first lesson to get started.', '')}</p>
                </div>

                {/* Result Message */}
                {result && (
                    <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${result.success
                        ? 'bg-emerald-500/10 border border-emerald-500/30'
                        : 'bg-red-500/10 border border-red-500/30'
                        }`}>
                        {result.success ? (
                            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        )}
                        <p className={result.success ? 'text-emerald-300' : 'text-red-300'}>
                            {result.message || result.error}
                        </p>
                    </div>
                )}

                {/* Loading State */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                    </div>
                ) : error ? (
                    <Card className="bg-red-500/10 border-red-500/30">
                        <CardContent className="py-8 text-center">
                            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                            <p className="text-red-300">{error}</p>
                        </CardContent>
                    </Card>
                ) : groupedLessons.length === 0 ? (
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="py-12 text-center">
                            <BookOpen className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                            <p className="text-zinc-400">{t('noLessons')}</p>
                            <p className="text-zinc-500 text-sm mt-2">
                                {t('noLessonsDesc')}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4" data-tour="lessons-list">
                        {groupedLessons.map((group) => (
                            <div key={group.code} className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                                {/* Course Header - Collapsible */}
                                <button
                                    onClick={() => toggleCourse(group.code)}
                                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        {expandedCourses.has(group.code) ? (
                                            <ChevronDown className="w-5 h-5 text-amber-400" />
                                        ) : (
                                            <ChevronRight className="w-5 h-5 text-zinc-500" />
                                        )}
                                        <div className="text-left">
                                            <h2 className="font-bold text-lg text-zinc-100">{group.code}</h2>
                                            <p className="text-sm text-zinc-500">{group.name}</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-zinc-400 border-zinc-600">
                                        {group.lessons.length} {group.lessons.length !== 1 ? t('lessons') : t('lesson')}
                                    </Badge>
                                </button>

                                {/* Lessons List */}
                                {expandedCourses.has(group.code) && (
                                    <div className="border-t border-zinc-800">
                                        {group.lessons.map((lesson, idx) => (
                                            <div
                                                key={lesson.id}
                                                className={`px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 ${idx < group.lessons.length - 1 ? 'border-b border-zinc-800/50' : ''
                                                    }`}
                                            >
                                                {/* Lesson Info */}
                                                <div className="flex-1 min-w-0 pl-8">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-medium text-zinc-100 truncate">{lesson.title}</h3>
                                                        {lesson.is_published === false && (
                                                            <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">Draft</Badge>
                                                        )}
                                                    </div>

                                                    {/* Content Badges */}
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {lesson.video_url && (
                                                            <Badge variant="outline" className="text-red-400 border-red-400/30 text-xs">
                                                                <Video className="w-3 h-3 me-1" /> {t('hasVideo')}
                                                            </Badge>
                                                        )}
                                                        {lesson.pdf_url && (
                                                            <Badge variant="outline" className="text-blue-400 border-blue-400/30 text-xs">
                                                                <FileText className="w-3 h-3 me-1" /> {t('hasPdf')}
                                                            </Badge>
                                                        )}
                                                        {lesson.quiz_id && (
                                                            <Badge variant="outline" className="text-green-400 border-green-400/30 text-xs">
                                                                <BrainCircuit className="w-3 h-3 me-1" /> {t('hasQuiz')}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className={`flex items-center gap-2 flex-shrink-0 pl-8 sm:pl-0`} {...(idx === 0 ? { 'data-tour': 'lesson-actions' } : {})}>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className={`h-9 px-3 text-xs sm:text-sm ${lesson.is_published === false ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'}`}
                                                        onClick={() => handleTogglePublish(lesson.id, lesson.is_published !== false, lesson.title)}
                                                        disabled={togglingId === lesson.id}
                                                    >
                                                        {togglingId === lesson.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <span className="hidden sm:inline">{lesson.is_published === false ? tc('publish') : tc('unpublish')}</span>
                                                        )}
                                                    </Button>
                                                    <Link href={`/admin/lessons/${lesson.id}/edit`}>
                                                        <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-9 px-3 text-xs sm:text-sm">
                                                            <Edit className="w-4 h-4 sm:me-1" />
                                                            <span className="hidden sm:inline">{tc('edit')}</span>
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 h-9 px-3 text-xs sm:text-sm"
                                                        onClick={() => handleDelete(lesson.id, lesson.title)}
                                                        disabled={deletingId === lesson.id}
                                                    >
                                                        {deletingId === lesson.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Trash2 className="w-4 h-4 sm:me-1" />
                                                                <span className="hidden sm:inline">{tc('delete')}</span>
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
