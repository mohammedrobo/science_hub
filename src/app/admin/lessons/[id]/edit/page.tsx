'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getLesson, updateLesson, getSignedUploadUrl, fetchPlaylistDetails } from '@/app/admin/actions';
import {
    ArrowLeft, Save, Video, FileText, BookOpen,
    Loader2, AlertCircle, CheckCircle, Home, Plus, Trash2, Link2, Upload, ListVideo
} from 'lucide-react';
import { QuizUploader } from '@/components/admin/QuizUploader';
import { QuizQuestion } from '@/lib/quiz-parser';
import { MOCK_COURSES } from '@/lib/data/mocks';
import { COURSE_SUBSECTIONS } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ACTIVE_COURSE_IDS = [
    'm101', 'p101', 'p103', 'c101', 'c101a', 'c101b', 'c103', 'z101', 'g101', 'u01', 'u02', 'u03',
    'm102', 'p102', 'p104', 'c102', 'c104', 'g102', 'z102', 'b101', 'b102', 'comp101', 'so100'
];

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
    const [courseId, setCourseId] = useState('');
    const [selectedInstructor, setSelectedInstructor] = useState<string>('');
    const [selectedSection, setSelectedSection] = useState<string>('');
    const [videoParts, setVideoParts] = useState<{ title: string; url: string }[]>([{ title: '', url: '' }]);
    const [pdfParts, setPdfParts] = useState<{ title: string; url: string; file: File | null; originalUrl?: string }[]>([{ title: '', url: '', file: null }]);
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
                // Populate video parts from DB data
                const dbParts = lesson.video_parts as { title: string; url: string }[] | undefined;
                if (dbParts && dbParts.length > 0) {
                    setVideoParts(dbParts);
                } else if (lesson.video_url) {
                    setVideoParts([{ title: '', url: lesson.video_url }]);
                } else {
                    setVideoParts([{ title: '', url: '' }]);
                }

                // Populate PDF parts from DB data
                const dbPdfParts = lesson.pdf_parts as { title: string; url: string }[] | undefined;
                if (dbPdfParts && dbPdfParts.length > 0) {
                    setPdfParts(dbPdfParts.map(p => ({ ...p, file: null, originalUrl: p.url })));
                } else if (lesson.pdf_url) {
                    setPdfParts([{ title: '', url: lesson.pdf_url, file: null, originalUrl: lesson.pdf_url }]);
                } else {
                    setPdfParts([{ title: '', url: '', file: null }]);
                }

                // Handle course array from Supabase join
                const course = Array.isArray(lesson.course) ? lesson.course[0] : lesson.course;
                setCourseInfo(course);
                
                if (course && course.code) {
                    // Try to match DB course.code (e.g., 'P102') with mock c.code to get lowercase id (e.g., 'p102')
                    const matchedMock = MOCK_COURSES.find(c => c.code.toLowerCase() === course.code.toLowerCase());
                    if (matchedMock) {
                        setCourseId(matchedMock.id);
                    } else {
                        // Fallback (e.g. if code is not in MOCK_COURSES)
                        setCourseId(course.code.toLowerCase());
                    }
                }
                
                setSelectedInstructor(lesson.instructor || '');
                setSelectedSection(lesson.section || '');

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
            const finalPdfParts: { title: string; url: string }[] = [];

            // Handle PDF Uploads and Links
            for (let i = 0; i < pdfParts.length; i++) {
                const part = pdfParts[i];
                let finalUrl = part.url;

                // Handle new PDF upload if file present
                if (part.file) {
                    const fileExt = part.file.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                    const filePath = `lessons/${fileName}`;

                    // 1. Get Signed URL token
                    const { token, error: signError } = await getSignedUploadUrl(filePath);

                    if (signError || !token) {
                        throw new Error(signError || 'Failed to get upload permission');
                    }

                    // 2. Upload directly to Supabase Storage
                    const { createClient } = require('@supabase/supabase-js');
                    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
                    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
                    const supabase = createClient(supabaseUrl, supabaseKey);

                    const { error: uploadError } = await supabase.storage
                        .from('pdfs')
                        .uploadToSignedUrl(filePath, token, part.file, {
                            contentType: part.file.type || 'application/pdf',
                            upsert: true
                        });

                    if (uploadError) {
                        throw new Error(`Upload failed for PDF ${i + 1}: ${uploadError.message}`);
                    }

                    // 3. Get Public URL
                    const { data } = supabase.storage
                        .from('pdfs')
                        .getPublicUrl(filePath);

                    finalUrl = data.publicUrl;
                }

                if (finalUrl.trim() || part.title.trim()) {
                    finalPdfParts.push({
                        title: part.title.trim() || `Document ${i + 1}`,
                        url: finalUrl.trim()
                    });
                }
            }

            // Built final PDF URL (backwards compatibility - use the first one)
            const fallbackPdfUrl = finalPdfParts.length > 0 ? finalPdfParts[0].url : null;

            const validParts = videoParts.filter(p => p.url.trim());
            const mainVideoUrl = validParts.length > 0 ? validParts[0].url : null;
            const finalParts = validParts.map((p, i) => ({
                title: p.title.trim() || `Part ${i + 1}`,
                url: p.url.trim()
            }));

            const response = await updateLesson(id, {
                course_id: courseId !== courseInfo?.code.toLowerCase() ? courseId : undefined,
                title,
                instructor: selectedInstructor || null,
                section: selectedSection || null,
                video_url: mainVideoUrl,
                video_parts: finalParts.length > 1 ? finalParts : [],
                pdf_url: fallbackPdfUrl,
                pdf_parts: finalPdfParts.length > 0 ? finalPdfParts : [],
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

    const [fetchingPlaylist, setFetchingPlaylist] = useState(false);

    const handleVideoUrlChange = async (index: number, newUrl: string) => {
        const updated = [...videoParts];
        updated[index] = { ...updated[index], url: newUrl };
        setVideoParts(updated);

        // Auto-detect playlist URL and extract videos
        if (newUrl.includes('list=') && !fetchingPlaylist) {
            setFetchingPlaylist(true);
            setResult({ success: true, message: '⏳ Extracting playlist videos...' });
            try {
                const res = await fetchPlaylistDetails(newUrl);
                if (res.error) {
                    setResult({ error: res.error });
                } else if (res.success && res.videos) {
                    setVideoParts(res.videos);
                    if (!title) setTitle(res.title);
                    setResult({ success: true, message: `✅ Extracted ${res.videos.length} videos from playlist!` });
                }
            } catch (err: any) {
                setResult({ error: err.message });
            } finally {
                setFetchingPlaylist(false);
            }
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
            <div className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/60 shadow-[0_1px_20px_-5px_rgba(0,0,0,0.5)]">
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
                <Card className="glass-card rounded-2xl border-zinc-800/60">
                    <CardHeader className="border-b border-zinc-800/50 px-4 sm:px-6">
                        <CardTitle className="text-lg text-zinc-100">
                            {courseInfo && (
                                <span className="text-violet-400 text-sm font-normal block mb-1">
                                    {courseInfo.code} - {courseInfo.name}
                                </span>
                            )}
                            Editing: {title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            
                            {/* Course Selector */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">
                                    Course <span className="text-red-400">*</span>
                                </label>
                                <Select 
                                    value={courseId} 
                                    onValueChange={(val) => {
                                        setCourseId(val);
                                        setSelectedInstructor('');
                                        setSelectedSection('');
                                    }}
                                >
                                    <SelectTrigger className="w-full bg-zinc-900/80 border-zinc-700/60 rounded-xl text-zinc-100">
                                        <SelectValue placeholder="Select course..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MOCK_COURSES.filter(c => ACTIVE_COURSE_IDS.includes(c.id.toLowerCase())).map(c => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.code} — {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Dynamic Sub-sections based on Course */}
                            {courseId && COURSE_SUBSECTIONS[courseId.toLowerCase()] && (
                                <div className="space-y-2 p-4 bg-violet-950/20 border border-violet-900/50 rounded-xl">
                                    <label className="text-sm font-medium text-amber-400 capitalize">
                                        {COURSE_SUBSECTIONS[courseId.toLowerCase()].label} <span className="text-red-400">*</span>
                                    </label>
                                    <Select 
                                        value={COURSE_SUBSECTIONS[courseId.toLowerCase()].type === 'instructor' ? selectedInstructor : selectedSection} 
                                        onValueChange={(val) => {
                                            if (COURSE_SUBSECTIONS[courseId.toLowerCase()].type === 'instructor') {
                                                setSelectedInstructor(val);
                                            } else {
                                                setSelectedSection(val);
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="w-full bg-zinc-900/80 border-zinc-700/60 rounded-xl text-zinc-100">
                                            <SelectValue placeholder={`Choose ${COURSE_SUBSECTIONS[courseId.toLowerCase()].type}...`} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {COURSE_SUBSECTIONS[courseId.toLowerCase()].options.map(opt => (
                                                <SelectItem key={opt.id} value={opt.id}>
                                                    {opt.name} {opt.nameAr ? `(${opt.nameAr})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

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
                                    className="w-full bg-zinc-900/80 border border-zinc-700/60 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                                    required
                                />
                            </div>

                            {/* YouTube URLs */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <Video className="w-4 h-4 text-red-400" />
                                    YouTube Video or Playlist
                                    <span className="text-zinc-500 text-xs">(optional)</span>
                                </label>

                                <div className="space-y-3">
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
                                                    onChange={(e) => handleVideoUrlChange(index, e.target.value)}
                                                    disabled={fetchingPlaylist}
                                                    placeholder="https://youtu.be/... or paste a playlist URL"
                                                    className="w-full bg-zinc-900/80 border border-zinc-700/60 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all disabled:opacity-50"
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

                                    {fetchingPlaylist && (
                                        <div className="flex items-center gap-2 p-3 bg-violet-500/10 border border-violet-500/30 rounded-xl">
                                            <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                                            <span className="text-sm text-violet-300">Extracting playlist videos...</span>
                                        </div>
                                    )}

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

                            {/* PDF Section */}
                            <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-400" />
                                    PDF Documents
                                    <span className="text-zinc-500 text-xs">(optional)</span>
                                </label>

                                <div className="space-y-4">
                                    {pdfParts.map((part, index) => (
                                        <div key={index} className="relative flex flex-col gap-4 glass-card p-5 rounded-2xl group hover:border-violet-500/30 transition-all duration-300">
                                            {/* Header + Delete Button */}
                                            <div className="flex justify-between items-center pb-3 border-b border-zinc-800/50">
                                                <div className="flex items-center gap-2">
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
                                                {part.originalUrl && !part.file && (
                                                    <div className="p-3.5 bg-zinc-900/60 rounded-xl border border-zinc-800/60">
                                                        <p className="text-xs text-zinc-400 mb-1 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Current PDF (Document {index + 1}):</p>
                                                        <a href={part.originalUrl} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 font-medium hover:underline text-sm truncate block mt-0.5">
                                                            {part.originalUrl}
                                                        </a>
                                                    </div>
                                                )}

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

                                                {/* File / URL Split */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5 px-0.5">
                                                            <Upload className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> Replace File <span className="text-zinc-600 ml-auto font-normal">Max 500MB</span>
                                                        </label>
                                                        <div className="relative group/file">
                                                            <input
                                                                type="file"
                                                                accept=".pdf"
                                                                onChange={(e) => {
                                                                    const updated = [...pdfParts];
                                                                    updated[index] = { ...updated[index], file: e.target.files?.[0] || null };
                                                                    setPdfParts(updated);
                                                                }}
                                                                className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-2 py-2 text-zinc-300 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-500/10 file:text-violet-400 hover:file:bg-violet-500/20 cursor-pointer transition-all h-[42px]"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5 px-0.5">
                                                            <Link2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" /> Or update the link
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
                            <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                                {existingQuizTitle && (
                                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl mb-4">
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
                                <div className={`p-4 rounded-xl flex items-start gap-3 ${result.success
                                    ? 'bg-emerald-500/10 border border-emerald-500/30 animate-success-pop'
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
                                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white py-6 text-base font-semibold shadow-lg shadow-violet-900/30 rounded-2xl transition-all duration-300 hover:shadow-violet-900/50"
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
