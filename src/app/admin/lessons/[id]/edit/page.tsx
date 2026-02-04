'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getLesson, updateLesson, getSignedUploadUrl } from '@/app/admin/actions';
import {
    ArrowLeft, Save, Video, FileText, BookOpen,
    Loader2, AlertCircle, CheckCircle, Home
} from 'lucide-react';
import { QuizUploader } from '@/components/admin/QuizUploader';
import { QuizQuestion } from '@/lib/quiz-parser';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function EditLessonPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

    // Form State
    const [title, setTitle] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [pdfUrl, setPdfUrl] = useState('');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [quizData, setQuizData] = useState<{ questions: QuizQuestion[] } | null>(null);
    const [existingQuizTitle, setExistingQuizTitle] = useState('');
    const [courseInfo, setCourseInfo] = useState<{ code: string; name: string } | null>(null);

    useEffect(() => {
        const fetchLesson = async () => {
            const res = await getLesson(id);
            if (res.error) {
                setError(res.error);
            } else if (res.lesson) {
                const lesson = res.lesson as any;
                setTitle(lesson.title || '');
                setVideoUrl(lesson.video_url || '');
                setPdfUrl(lesson.pdf_url || '');
                // Handle course array from Supabase join
                const course = Array.isArray(lesson.course) ? lesson.course[0] : lesson.course;
                setCourseInfo(course);

                if (lesson.quiz_title && lesson.questions) {
                    setExistingQuizTitle(lesson.quiz_title);
                    setQuizData({ questions: lesson.questions });
                }
            }
            setLoading(false);
        };
        fetchLesson();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setResult({ error: 'Title is required' });
            return;
        }

        setSaving(true);
        setResult(null);

        try {
            let finalPdfUrl = pdfUrl;

            // Handle new PDF upload
            if (pdfFile) {
                const fileExt = pdfFile.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `lessons/${fileName}`;

                // 1. Get Signed URL token
                const { token, error: signError } = await getSignedUploadUrl(filePath);

                if (signError || !token) {
                    throw new Error(signError || 'Failed to get upload permission');
                }

                // 2. Upload directly to Supabase Storage
                // Import the client supabase instance or use a fresh client here
                const { createClient } = require('@supabase/supabase-js');
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
                const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
                const supabase = createClient(supabaseUrl, supabaseKey);

                const { error: uploadError } = await supabase.storage
                    .from('pdfs')
                    .uploadToSignedUrl(filePath, token, pdfFile, {
                        contentType: pdfFile.type || 'application/pdf',
                        upsert: true
                    });

                if (uploadError) {
                    throw new Error('Upload failed: ' + uploadError.message);
                }

                // 3. Get Public URL
                const { data } = supabase.storage
                    .from('pdfs')
                    .getPublicUrl(filePath);

                finalPdfUrl = data.publicUrl;
            }

            const response = await updateLesson(id, {
                title,
                video_url: videoUrl || undefined,
                pdf_url: finalPdfUrl || undefined,
                quiz_data: quizData ? {
                    title: existingQuizTitle || `${title} Quiz`,
                    questions: quizData.questions
                } : undefined
            });

            if (response.error) {
                setResult({ error: response.error });
            } else {
                setResult({ success: true, message: response.message });
                // Redirect after short delay
                setTimeout(() => router.push('/admin/lessons'), 1500);
            }
        } catch (err: any) {
            setResult({ error: err.message || 'Unexpected error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
                <Card className="bg-red-500/10 border-red-500/30 max-w-md">
                    <CardContent className="py-8 text-center">
                        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                        <p className="text-red-300 mb-4">{error}</p>
                        <Link href="/admin/lessons">
                            <Button variant="outline">Back to Lessons</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950">
            {/* Header - Simple back navigation */}
            <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
                <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/admin/lessons" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                            <span className="font-medium text-sm sm:text-base">Back</span>
                        </Link>
                        <h1 className="text-base sm:text-lg font-bold text-amber-400 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                            Edit Lesson
                        </h1>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-3xl">
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="border-b border-zinc-800">
                        <CardTitle className="text-lg text-zinc-100">
                            {courseInfo && (
                                <span className="text-violet-400 text-sm font-normal block mb-1">
                                    {courseInfo.code} - {courseInfo.name}
                                </span>
                            )}
                            Editing: {title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Lesson Title */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">
                                    Lesson Title <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Lecture 5: Chemical Bonding"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            {/* YouTube URL */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <Video className="w-4 h-4 text-red-400" />
                                    YouTube Link
                                    <span className="text-zinc-500 text-xs">(optional)</span>
                                </label>
                                <input
                                    type="url"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    placeholder="https://youtu.be/..."
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                />
                            </div>

                            {/* PDF Section */}
                            <div className="space-y-4 pt-4 border-t border-zinc-800">
                                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-400" />
                                    PDF Document
                                    <span className="text-zinc-500 text-xs">(optional)</span>
                                </label>

                                {pdfUrl && !pdfFile && (
                                    <div className="p-3 bg-zinc-800/50 rounded-md border border-zinc-700">
                                        <p className="text-xs text-zinc-400 mb-1">Current PDF:</p>
                                        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm truncate block">
                                            {pdfUrl}
                                        </a>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <p className="text-xs text-zinc-500">Upload New File (Max 500MB)</p>
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-zinc-300 text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-violet-900/30 file:text-violet-300 hover:file:bg-violet-900/50 cursor-pointer"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs text-zinc-500">Or update the link</p>
                                        <input
                                            type="text"
                                            value={pdfUrl}
                                            onChange={(e) => setPdfUrl(e.target.value)}
                                            placeholder="https://..."
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Quiz Section */}
                            <div className="space-y-4 pt-4 border-t border-zinc-800">
                                {existingQuizTitle && (
                                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-md mb-4">
                                        <p className="text-xs text-green-400">
                                            Existing Quiz: <span className="font-medium">{existingQuizTitle}</span>
                                            <br />
                                            <span className="text-green-300/70">Uploading new quiz data will replace the existing quiz.</span>
                                        </p>
                                    </div>
                                )}
                                <QuizUploader onQuizDataChange={setQuizData} />
                            </div>

                            {/* Result Message */}
                            {result && (
                                <div className={`p-4 rounded-md flex items-start gap-3 ${result.success
                                    ? 'bg-emerald-500/10 border border-emerald-500/30'
                                    : 'bg-red-500/10 border border-red-500/30'
                                    }`}>
                                    {result.success ? (
                                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
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
                                disabled={saving}
                                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white py-6 text-base font-semibold shadow-lg shadow-violet-900/30"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Saving Changes...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5 mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
