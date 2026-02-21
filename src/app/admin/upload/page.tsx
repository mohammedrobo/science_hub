'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COURSE_SUBSECTIONS } from '@/lib/constants';
import { MOCK_COURSES } from '@/lib/data/mocks';
import { createLesson, getSignedUploadUrl } from '../actions';
import {
    Upload, ArrowLeft, Video, FileText, BookOpen, CheckCircle, AlertCircle,
    Loader2, User, Home, Plus, Trash2, Link2, CloudUpload, X, FileCheck,
    GripVertical, Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { QuizUploader } from '@/components/admin/QuizUploader';
import { QuizQuestion } from '@/lib/quiz-parser';
import { useTranslations } from 'next-intl';
import { LeaderTour } from '@/components/leader/LeaderTour';

// Format file size to human readable
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Step indicator data
const STEPS = [
    { id: 'course', label: 'Course', icon: BookOpen },
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'media', label: 'Media', icon: CloudUpload },
    { id: 'review', label: 'Submit', icon: CheckCircle },
];

export default function UploadPage() {
    const t = useTranslations('upload');
    const tc = useTranslations('common');
    const [selectedCourse, setSelectedCourse] = useState('');
    const [subSection, setSubSection] = useState('');
    const [title, setTitle] = useState('');
    const [videoParts, setVideoParts] = useState<{ title: string; url: string }[]>([{ title: '', url: '' }]);
    const [pdfParts, setPdfParts] = useState<{ title: string; url: string; file: File | null }[]>([{ title: '', url: '', file: null }]);
    const [quizData, setQuizData] = useState<{ questions: QuizQuestion[] } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
    const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});
    const [shakeIndex, setShakeIndex] = useState<number | null>(null);

    // Get sub-section config for selected course
    const subSectionConfig = COURSE_SUBSECTIONS[selectedCourse];

    // Reset sub-section when course changes
    useEffect(() => {
        setSubSection('');
    }, [selectedCourse]);

    // Compute current step for stepper
    const currentStep = !selectedCourse ? 0 : !title ? 1 : 2;

    // Validate file
    const validateFile = useCallback((file: File, index: number): boolean => {
        const errors = { ...validationErrors };

        if (file.type !== 'application/pdf') {
            errors[index] = 'Only PDF files are allowed';
            setValidationErrors(errors);
            setShakeIndex(index);
            setTimeout(() => setShakeIndex(null), 500);
            return false;
        }

        if (file.size > 500 * 1024 * 1024) {
            errors[index] = `File too large (${formatFileSize(file.size)}). Max 500MB allowed.`;
            setValidationErrors(errors);
            setShakeIndex(index);
            setTimeout(() => setShakeIndex(null), 500);
            return false;
        }

        // Clear error on valid
        delete errors[index];
        setValidationErrors(errors);
        return true;
    }, [validationErrors]);

    // Handle drag and drop
    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverIndex(index);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverIndex(null);
    };

    const handleDrop = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverIndex(null);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (validateFile(file, index)) {
                const updated = [...pdfParts];
                updated[index] = { ...updated[index], file };
                if (!updated[index].title) {
                    updated[index].title = file.name.replace('.pdf', '');
                }
                setPdfParts(updated);
            }
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (validateFile(file, index)) {
            const updated = [...pdfParts];
            updated[index] = { ...updated[index], file };
            if (!updated[index].title) {
                updated[index].title = file.name.replace('.pdf', '');
            }
            setPdfParts(updated);
        }
    };

    const removeFile = (index: number) => {
        const updated = [...pdfParts];
        updated[index] = { ...updated[index], file: null };
        setPdfParts(updated);
        // Clear progress and errors
        const newProgress = { ...uploadProgress };
        delete newProgress[index];
        setUploadProgress(newProgress);
        const newErrors = { ...validationErrors };
        delete newErrors[index];
        setValidationErrors(newErrors);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse || !title) {
            setResult({ error: 'Please select a course and enter a title' });
            return;
        }

        // Require sub-section for configured courses
        if (subSectionConfig && !subSection) {
            setResult({ error: `Please ${subSectionConfig.label.toLowerCase()}` });
            return;
        }

        setIsSubmitting(true);
        setResult(null);
        setUploadProgress({});

        try {
            const finalPdfParts: { title: string; url: string }[] = [];

            // Handle PDF Uploads and Links
            for (let i = 0; i < pdfParts.length; i++) {
                const part = pdfParts[i];
                let finalUrl = part.url;

                if (part.file) {
                    // Set initial progress
                    setUploadProgress(prev => ({ ...prev, [i]: 10 }));

                    const fileExt = part.file.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                    const filePath = `${selectedCourse}/${fileName}`;

                    // 1. Get Signed URL token from server (secure)
                    setUploadProgress(prev => ({ ...prev, [i]: 20 }));
                    const { token, error: signError } = await getSignedUploadUrl(filePath);

                    if (signError || !token) {
                        throw new Error(signError || 'Failed to get upload permission');
                    }

                    // 2. Upload directly to Supabase Storage using the token
                    setUploadProgress(prev => ({ ...prev, [i]: 40 }));
                    const { error: uploadError } = await supabase.storage
                        .from('pdfs')
                        .uploadToSignedUrl(filePath, token, part.file, {
                            contentType: part.file.type || 'application/pdf',
                        });

                    if (uploadError) {
                        throw new Error(`Upload failed for PDF ${i + 1}: ${uploadError.message}`);
                    }

                    setUploadProgress(prev => ({ ...prev, [i]: 90 }));

                    // 3. Get Public URL
                    const { data } = supabase.storage
                        .from('pdfs')
                        .getPublicUrl(filePath);

                    finalUrl = data.publicUrl;
                    setUploadProgress(prev => ({ ...prev, [i]: 100 }));
                }

                if (finalUrl.trim() || part.title.trim()) {
                    finalPdfParts.push({
                        title: part.title.trim() || `Document ${i + 1}`,
                        url: finalUrl.trim()
                    });
                }
            }

            // Built final PDF URL (backwards compatibility - use the first one)
            const fallbackPdfUrl = finalPdfParts.length > 0 ? finalPdfParts[0].url : undefined;

            // Build lesson title with sub-section prefix if applicable
            const subSectionName = subSectionConfig?.options.find(o => o.id === subSection)?.name;
            const finalTitle = subSectionName ? `[${subSectionName}] ${title}` : title;

            // Build video data from parts
            const validParts = videoParts.filter(p => p.url.trim());
            const mainVideoUrl = validParts.length > 0 ? validParts[0].url : undefined;
            // Auto-title parts that have no title
            const finalParts = validParts.map((p, i) => ({
                title: p.title.trim() || `Part ${i + 1}`,
                url: p.url.trim()
            }));

            const response = await createLesson({
                course_id: selectedCourse,
                title: finalTitle,
                video_url: mainVideoUrl,
                video_parts: finalParts.length > 1 ? finalParts : [],
                pdf_url: fallbackPdfUrl,
                pdf_parts: finalPdfParts.length > 0 ? finalPdfParts : [],
                instructor: subSectionConfig?.type === 'instructor' ? subSection : undefined,
                section: subSectionConfig?.type === 'section' ? subSection : undefined,
                quiz_data: quizData ? {
                    title: `${finalTitle} Quiz`,
                    questions: quizData.questions
                } : undefined
            });

            if (response.error) {
                setResult({ error: response.error });
            } else {
                setResult({ success: true, message: response.message });
                // Reset form
                setTitle('');
                setVideoParts([{ title: '', url: '' }]);
                setPdfParts([{ title: '', url: '', file: null }]);
                setQuizData(null);
                setSubSection('');
                setUploadProgress({});
            }
        } catch (err: any) {
            console.error(err);
            setResult({ error: err.message || 'Unexpected error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Group courses by semester
    const semester1Courses = MOCK_COURSES.filter(c => c.semester === 1);
    const semester2Courses = MOCK_COURSES.filter(c => c.semester === 2);

    return (
        <div className="min-h-screen bg-zinc-950">
            <LeaderTour page="upload" />
            {/* Header - Simple back navigation */}
            <div className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/60 shadow-[0_1px_20px_-5px_rgba(0,0,0,0.5)]">
                <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/leader" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                            <span className="font-medium text-sm sm:text-base">{tc('back')}</span>
                        </Link>
                        <h1 className="text-base sm:text-lg font-bold text-violet-400 flex items-center gap-2">
                            <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="hidden xs:inline">{t('title')}</span>
                        </h1>
                        <Link href="/">
                            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                                <Home className="w-5 h-5" />
                                <span className="ms-2 hidden sm:inline">{tc('back')}</span>
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-3xl">

                {/* Step Indicator */}
                <div className="flex items-center justify-between mb-8 px-2">
                    {STEPS.map((step, index) => {
                        const Icon = step.icon;
                        const isActive = index === currentStep;
                        const isCompleted = index < currentStep;
                        return (
                            <div key={step.id} className="flex items-center flex-1 last:flex-none">
                                <div className="flex flex-col items-center gap-1.5">
                                    <div className={`
                                        w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                                        ${isCompleted
                                            ? 'bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-400'
                                            : isActive
                                                ? 'bg-violet-500/20 border-2 border-violet-500/50 text-violet-400 pulse-glow'
                                                : 'bg-zinc-900 border-2 border-zinc-800 text-zinc-600'
                                        }
                                    `}>
                                        {isCompleted ? (
                                            <CheckCircle className="w-5 h-5" />
                                        ) : (
                                            <Icon className="w-4 h-4" />
                                        )}
                                    </div>
                                    <span className={`text-[10px] sm:text-xs font-medium transition-colors ${isActive ? 'text-violet-400' : isCompleted ? 'text-emerald-400' : 'text-zinc-600'
                                        }`}>
                                        {step.label}
                                    </span>
                                </div>
                                {index < STEPS.length - 1 && (
                                    <div className={`flex-1 h-0.5 mx-2 sm:mx-3 rounded-full transition-colors duration-300 ${index < currentStep ? 'bg-emerald-500/40' : 'bg-zinc-800'
                                        }`} />
                                )}
                            </div>
                        );
                    })}
                </div>

                <Card className="glass-card rounded-2xl border-zinc-800/60">
                    <CardHeader className="border-b border-zinc-800/50 px-4 sm:px-6">
                        <CardTitle className="text-base sm:text-lg text-zinc-100 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-violet-400" />
                            {t('title')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Course Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">
                                    {t('selectCourse')} <span className="text-red-400">*</span>
                                </label>
                                <select
                                    value={selectedCourse}
                                    onChange={(e) => setSelectedCourse(e.target.value)}
                                    className="w-full bg-zinc-900/80 border border-zinc-700/60 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                                    required
                                    data-tour="course-select"
                                >
                                    <option value="">-- {t('chooseCourse')} --</option>
                                    <optgroup label={`${t('semester1')} (Closed)`}>
                                        {semester1Courses.map(course => (
                                            <option key={course.id} value={course.id}>
                                                {course.code} - {course.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label={`${t('semester2')} (Active)`}>
                                        {semester2Courses.map(course => (
                                            <option key={course.id} value={course.id}>
                                                {course.code} - {course.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>

                            {/* Sub-Section Selection (for P102, C102) */}
                            {subSectionConfig && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                        <User className="w-4 h-4 text-amber-400" />
                                        {subSectionConfig.label} <span className="text-red-400">*</span>
                                    </label>
                                    <select
                                        value={subSection}
                                        onChange={(e) => setSubSection(e.target.value)}
                                        className="w-full bg-zinc-900/80 border border-zinc-700/60 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                                        required
                                    >
                                        <option value="">-- {subSectionConfig.label} --</option>
                                        {subSectionConfig.options.map(opt => (
                                            <option key={opt.id} value={opt.id}>
                                                {opt.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-zinc-500">
                                        Lecture will be grouped under this {subSectionConfig.type === 'instructor' ? 'doctor' : 'section'}
                                    </p>
                                </div>
                            )}

                            {/* Lesson Title */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">
                                    {t('lessonTitle')} <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Lecture 5: Chemical Bonding"
                                    className="w-full bg-zinc-900/80 border border-zinc-700/60 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                                    required
                                    data-tour="lesson-title"
                                />
                            </div>

                            {/* YouTube URLs */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <Video className="w-4 h-4 text-red-400" />
                                    {t('videoUrl')}
                                    <span className="text-zinc-500 text-xs">({tc('optional')})</span>
                                </label>

                                <div className="space-y-3" data-tour="video-url">
                                    {videoParts.map((part, index) => (
                                        <div key={index} className="flex gap-2 items-start">
                                            <div className="flex-1 space-y-2">
                                                {videoParts.length > 1 && (
                                                    <input
                                                        type="text"
                                                        value={part.title}
                                                        onChange={(e) => {
                                                            const updated = [...videoParts];
                                                            updated[index] = { ...updated[index], title: e.target.value };
                                                            setVideoParts(updated);
                                                        }}
                                                        placeholder={`Part ${index + 1} title (optional)`}
                                                        className="w-full bg-zinc-900/50 border border-zinc-700/40 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm transition-all"
                                                    />
                                                )}
                                                <input
                                                    type="url"
                                                    value={part.url}
                                                    onChange={(e) => {
                                                        const updated = [...videoParts];
                                                        updated[index] = { ...updated[index], url: e.target.value };
                                                        setVideoParts(updated);
                                                    }}
                                                    placeholder="https://youtu.be/..."
                                                    className="w-full bg-zinc-900/80 border border-zinc-700/60 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                                                />
                                            </div>
                                            {videoParts.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="mt-auto h-10 w-10 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0 rounded-xl"
                                                    onClick={() => setVideoParts(videoParts.filter((_, i) => i !== index))}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="border-dashed border-zinc-700 text-zinc-400 hover:text-violet-400 hover:border-violet-500/50 rounded-xl"
                                        onClick={() => setVideoParts([...videoParts, { title: '', url: '' }])}
                                    >
                                        <Plus className="w-4 h-4 me-1" />
                                        Add another video
                                    </Button>

                                    {videoParts.length > 1 && (
                                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                                            <Video className="w-3 h-3" />
                                            {videoParts.filter(p => p.url.trim()).length} video(s) — will show as playlist with sidebar
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* ===== PDF Section — Complete Redesign ===== */}
                            <div className="space-y-4 pt-4 border-t border-zinc-800/50" data-tour="pdf-section">
                                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-400" />
                                    {t('pdfFile')}
                                    <span className="text-zinc-500 text-xs">({tc('optional')})</span>
                                </label>

                                <div className="space-y-4">
                                    {pdfParts.map((part, index) => (
                                        <div
                                            key={index}
                                            className={`
                                                relative flex flex-col gap-4 glass-card p-5 rounded-2xl group/pdf transition-all duration-300
                                                ${shakeIndex === index ? 'animate-shake' : ''}
                                                ${dragOverIndex === index ? 'drag-over' : ''}
                                            `}
                                            onDragOver={(e) => handleDragOver(e, index)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, index)}
                                        >
                                            {/* Header + Delete Button */}
                                            <div className="flex justify-between items-center pb-3 border-b border-zinc-800/40">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500/30 to-indigo-500/30 text-violet-300 flex items-center justify-center text-xs font-bold border border-violet-500/30">
                                                        {index + 1}
                                                    </div>
                                                    <span className="text-sm font-semibold text-zinc-200">Document {index + 1}</span>
                                                </div>
                                                {pdfParts.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                                                        onClick={() => setPdfParts(pdfParts.filter((_, i) => i !== index))}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>

                                            <div className="space-y-4">
                                                {/* Title Input */}
                                                <div>
                                                    <input
                                                        type="text"
                                                        value={part.title}
                                                        onChange={(e) => {
                                                            const updated = [...pdfParts];
                                                            updated[index] = { ...updated[index], title: e.target.value };
                                                            setPdfParts(updated);
                                                        }}
                                                        placeholder={`e.g., Chapter ${index + 1} Summary, Assignment Answers`}
                                                        className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-sm transition-all"
                                                    />
                                                </div>

                                                {/* Drag-and-Drop Upload Zone OR File Preview */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5 px-0.5">
                                                            <Upload className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> Local File <span className="text-zinc-600 ml-auto font-normal">Max 500MB</span>
                                                        </label>

                                                        {part.file ? (
                                                            /* File Selected — Preview Card */
                                                            <div className="relative bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3 animate-success-pop">
                                                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                                                    <FileCheck className="w-5 h-5 text-emerald-400" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-zinc-200 truncate">{part.file.name}</p>
                                                                    <p className="text-xs text-zinc-500">{formatFileSize(part.file.size)}</p>
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg flex-shrink-0"
                                                                    onClick={() => removeFile(index)}
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </Button>

                                                                {/* Upload progress bar */}
                                                                {uploadProgress[index] !== undefined && uploadProgress[index] < 100 && (
                                                                    <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl overflow-hidden bg-zinc-900">
                                                                        <div
                                                                            className="h-full progress-bar-animated transition-all duration-300 ease-out rounded-full"
                                                                            style={{ width: `${uploadProgress[index]}%` }}
                                                                        />
                                                                    </div>
                                                                )}
                                                                {uploadProgress[index] === 100 && (
                                                                    <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl overflow-hidden">
                                                                        <div className="h-full w-full bg-emerald-500 rounded-full" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            /* Drag-and-Drop Zone */
                                                            <label className={`
                                                                relative flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-6 px-4
                                                                cursor-pointer transition-all duration-300 group/dropzone
                                                                ${dragOverIndex === index
                                                                    ? 'border-violet-500 bg-violet-500/5 shadow-[inset_0_0_20px_-5px_rgba(139,92,246,0.15)]'
                                                                    : 'border-zinc-700/60 bg-zinc-900/40 hover:border-violet-500/40 hover:bg-violet-500/5'
                                                                }
                                                            `}>
                                                                <div className={`
                                                                    w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                                                                    ${dragOverIndex === index
                                                                        ? 'bg-violet-500/20 text-violet-400 scale-110'
                                                                        : 'bg-zinc-800 text-zinc-500 group-hover/dropzone:bg-violet-500/10 group-hover/dropzone:text-violet-400'
                                                                    }
                                                                `}>
                                                                    <CloudUpload className="w-5 h-5" />
                                                                </div>
                                                                <div className="text-center">
                                                                    <p className="text-xs font-medium text-zinc-400">
                                                                        <span className="text-violet-400">Click to browse</span> or drag & drop
                                                                    </p>
                                                                    <p className="text-[10px] text-zinc-600 mt-0.5">PDF files only</p>
                                                                </div>
                                                                <input
                                                                    type="file"
                                                                    accept=".pdf"
                                                                    onChange={(e) => handleFileSelect(e, index)}
                                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                                />
                                                            </label>
                                                        )}

                                                        {/* Validation Error */}
                                                        {validationErrors[index] && (
                                                            <div className="flex items-center gap-1.5 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                                                {validationErrors[index]}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5 px-0.5">
                                                            <Link2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" /> External Link
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={part.url}
                                                            onChange={(e) => {
                                                                const updated = [...pdfParts];
                                                                updated[index] = { ...updated[index], url: e.target.value };
                                                                setPdfParts(updated);
                                                            }}
                                                            placeholder="https://drive.google.com/..."
                                                            className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-sm transition-all h-[42px]"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full h-12 border-dashed border-zinc-700/60 hover:border-violet-500/50 text-zinc-400 hover:text-violet-400 hover:bg-violet-500/5 transition-all outline-none rounded-2xl bg-zinc-900/20 mt-2"
                                        onClick={() => setPdfParts([...pdfParts, { title: '', url: '', file: null }])}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add another PDF document
                                    </Button>
                                </div>
                            </div>

                            {/* Quiz Section */}
                            <div className="space-y-4 pt-4 border-t border-zinc-800/50" data-tour="quiz-section">
                                <QuizUploader
                                    onQuizDataChange={setQuizData}
                                />
                            </div>

                            {/* Result Message */}
                            {result && (
                                <div className={`p-4 rounded-xl flex items-start gap-3 ${result.success
                                    ? 'bg-emerald-500/10 border border-emerald-500/30 animate-success-pop'
                                    : 'bg-red-500/10 border border-red-500/30'
                                    }`}>
                                    {result.success ? (
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                            <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-pulse" />
                                        </div>
                                    ) : (
                                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                    )}
                                    <p className={result.success ? 'text-emerald-300' : 'text-red-300'}>
                                        {result.message || result.error}
                                    </p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white py-6 text-base font-semibold shadow-lg shadow-violet-900/30 rounded-2xl transition-all duration-300 hover:shadow-violet-900/50"
                                data-tour="submit-btn"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 me-2 animate-spin" />
                                        {pdfParts.some(p => p.file) ? t('uploading') : tc('loading')}
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5 me-2" />
                                        {t('title')}
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div >
        </div >
    );
}
