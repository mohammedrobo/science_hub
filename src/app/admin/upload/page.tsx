'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createLesson, getSignedUploadUrl } from '@/app/admin/actions';
import {
    ArrowLeft, Save, Video, FileText, BookOpen,
    Loader2, AlertCircle, CheckCircle, Plus, Trash2, Link2, Upload
} from 'lucide-react';
import { QuizUploader } from '@/components/admin/QuizUploader';
import { QuizQuestion } from '@/lib/quiz-parser';
import { MOCK_COURSES } from '@/lib/data/mocks';
import { COURSE_SUBSECTIONS } from '@/lib/constants';

const ACTIVE_COURSE_IDS = [
    'm101', 'p101', 'p103', 'c101', 'c101a', 'c101b', 'c103', 'z101', 'g101', 'u01', 'u02', 'u03',
    'm102', 'p102', 'p104', 'c102', 'c104', 'g102', 'z102', 'b101', 'b102', 'comp101', 'so100'
];

export default function UploadLessonPage() {
    const router = useRouter();

    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

    // Form State
    const [courseId, setCourseId] = useState('');
    const [selectedInstructor, setSelectedInstructor] = useState<string>('');
    const [selectedSection, setSelectedSection] = useState<string>('');
    const [title, setTitle] = useState('');
    const [videoParts, setVideoParts] = useState<{ title: string; url: string }[]>([{ title: '', url: '' }]);
    const [pdfParts, setPdfParts] = useState<{ title: string; url: string; file: File | null }[]>([{ title: '', url: '', file: null }]);
    const [quizData, setQuizData] = useState<{ questions: QuizQuestion[] } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setResult({ error: 'Title is required' });
            return;
        }
        if (!courseId) {
            setResult({ error: 'Course is required' });
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

            // Build final PDF URL (backwards compatibility - use the first one)
            const fallbackPdfUrl = finalPdfParts.length > 0 ? finalPdfParts[0].url : undefined;

            const validParts = videoParts.filter(p => p.url.trim());
            const mainVideoUrl = validParts.length > 0 ? validParts[0].url : undefined;
            const finalParts = validParts.map((p, i) => ({
                title: p.title.trim() || `Part ${i + 1}`,
                url: p.url.trim()
            }));

            const response = await createLesson({
                course_id: courseId,
                title,
                instructor: selectedInstructor || undefined,
                section: selectedSection || undefined,
                video_url: mainVideoUrl || undefined,
                video_parts: finalParts.length > 1 ? finalParts : [],
                pdf_url: fallbackPdfUrl,
                pdf_parts: finalPdfParts.length > 0 ? finalPdfParts : [],
                quiz_data: quizData ? {
                    title: `${title} Quiz`,
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

    return (
        <div className="min-h-screen bg-zinc-950">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/60 shadow-[0_1px_20px_-5px_rgba(0,0,0,0.5)]">
                <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/admin/lessons" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                            <span className="font-medium text-sm sm:text-base">Back</span>
                        </Link>
                        <h1 className="text-base sm:text-lg font-bold text-amber-400 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                            Upload Lesson
                        </h1>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-3xl">
                <Card className="glass-card rounded-2xl border-zinc-800/60">
                    <CardHeader className="border-b border-zinc-800/50 px-4 sm:px-6">
                        <CardTitle className="text-lg text-zinc-100">
                            Create New Lesson
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
                                    YouTube Links
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
                                                            <Upload className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> Upload File <span className="text-zinc-600 ml-auto font-normal">Max 500MB</span>
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
                                                            <Link2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" /> Or paste a link
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
                                        Creating Lesson...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5 mr-2" />
                                        Create Lesson
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
