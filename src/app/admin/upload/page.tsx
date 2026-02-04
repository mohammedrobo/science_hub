'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MOCK_COURSES, COURSE_SUBSECTIONS } from '@/lib/constants';
import { createLesson, getSignedUploadUrl } from '../actions';
import { Upload, ArrowLeft, Video, FileText, BookOpen, CheckCircle, AlertCircle, Loader2, User, Home } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { QuizUploader } from '@/components/admin/QuizUploader';
import { QuizQuestion } from '@/lib/quiz-parser';

export default function UploadPage() {
    const [selectedCourse, setSelectedCourse] = useState('');
    const [subSection, setSubSection] = useState('');
    const [title, setTitle] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [pdfUrl, setPdfUrl] = useState('');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [quizData, setQuizData] = useState<{ questions: QuizQuestion[] } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

    // Get sub-section config for selected course
    const subSectionConfig = COURSE_SUBSECTIONS[selectedCourse];

    // Reset sub-section when course changes
    useEffect(() => {
        setSubSection('');
    }, [selectedCourse]);

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

        try {
            let finalPdfUrl = pdfUrl;

            // Handle File Upload if selected
            if (pdfFile) {
                const fileExt = pdfFile.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${selectedCourse}/${fileName}`;

                // 1. Get Signed URL token from server (secure)
                // This bypasses the Next.js body size limit by uploading directly to Supabase from the browser
                const { token, error: signError } = await getSignedUploadUrl(filePath);

                if (signError || !token) {
                    throw new Error(signError || 'Failed to get upload permission');
                }

                // 2. Upload directly to Supabase Storage using the token
                const { error: uploadError } = await supabase.storage
                    .from('pdfs')
                    .uploadToSignedUrl(filePath, token, pdfFile, {
                        contentType: pdfFile.type || 'application/pdf',
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

            // Build lesson title with sub-section prefix if applicable
            const subSectionName = subSectionConfig?.options.find(o => o.id === subSection)?.name;
            const finalTitle = subSectionName ? `[${subSectionName}] ${title}` : title;

            const response = await createLesson({
                course_id: selectedCourse,
                title: finalTitle,
                video_url: videoUrl || undefined,
                pdf_url: finalPdfUrl || undefined,
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
                setVideoUrl('');
                setPdfUrl('');
                setPdfFile(null);
                setQuizData(null);
                setSubSection('');
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
            {/* Header - Simple back navigation */}
            <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
                <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/leader" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                            <span className="font-medium text-sm sm:text-base">Back</span>
                        </Link>
                        <h1 className="text-base sm:text-lg font-bold text-blue-400 flex items-center gap-2">
                            <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="hidden xs:inline">Upload</span> Lesson
                        </h1>
                        <Link href="/">
                            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                                <Home className="w-5 h-5" />
                                <span className="ml-2 hidden sm:inline">Home</span>
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-3xl">
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="border-b border-zinc-800 px-4 sm:px-6">
                        <CardTitle className="text-base sm:text-lg text-zinc-100 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-violet-400" />
                            New Lesson
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Course Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">
                                    Select Course <span className="text-red-400">*</span>
                                </label>
                                <select
                                    value={selectedCourse}
                                    onChange={(e) => setSelectedCourse(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                    required
                                >
                                    <option value="">-- Choose a course --</option>
                                    <optgroup label="Term 1 (Closed)">
                                        {semester1Courses.map(course => (
                                            <option key={course.id} value={course.id}>
                                                {course.code} - {course.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Term 2 (Active)">
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
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <p className="text-xs text-zinc-500">Upload File (Max 500MB)</p>
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-zinc-300 text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-violet-900/30 file:text-violet-300 hover:file:bg-violet-900/50 cursor-pointer"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs text-zinc-500">Or use a link</p>
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
                                disabled={isSubmitting}
                                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white py-6 text-base font-semibold shadow-lg shadow-violet-900/30"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        {pdfFile ? 'Uploading & Saving...' : 'Saving Lesson...'}
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5 mr-2" />
                                        Add Lesson
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
