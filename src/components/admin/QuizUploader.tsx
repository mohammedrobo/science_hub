'use client';

import { useState, useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle, BrainCircuit, ChevronDown, ChevronUp, FileText, Hash, ListChecks, ToggleLeft, PenLine } from 'lucide-react';
import { parseQuizText, QuizQuestion } from '@/lib/quiz-parser';
import { MathText } from '@/components/MathText';

interface QuizUploaderProps {
    onQuizDataChange: (data: { questions: QuizQuestion[] } | null) => void;
}

export function QuizUploader({ onQuizDataChange }: QuizUploaderProps) {
    const [rawText, setRawText] = useState('');
    const [parsedQuestions, setParsedQuestions] = useState<QuizQuestion[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [showHelp, setShowHelp] = useState(false);
    const [stats, setStats] = useState<{ totalDetected: number; withAnswers: number; withoutAnswers: number; truefalseCount: number; mcqCount: number; fillBlankCount: number } | null>(null);

    const onChangeRef = useRef(onQuizDataChange);
    onChangeRef.current = onQuizDataChange;

    // Live parsing
    useEffect(() => {
        if (!rawText.trim()) {
            setParsedQuestions([]);
            setErrors([]);
            setStats(null);
            onChangeRef.current(null);
            return;
        }

        const result = parseQuizText(rawText);
        setParsedQuestions(result.questions);
        setErrors(result.errors);
        setStats(result.stats);

        const hasBlockingError = result.errors.some(e => e.startsWith('❌'));
        const allMissingAnswers = result.questions.length > 0 && result.stats.withAnswers === 0;

        if (hasBlockingError || allMissingAnswers) {
            // Block: no questions found, or ALL questions missing answers
            onChangeRef.current(null);
        } else if (result.questions.length > 0) {
            // Pass: at least some questions have answers
            onChangeRef.current({ questions: result.questions });
        } else {
            onChangeRef.current(null);
        }
    }, [rawText]);

    const hasBlockingError = errors.some(e => e.startsWith('❌'));
    const hasWarnings = errors.length > 0 && !hasBlockingError;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4 text-violet-400" />
                        Quiz Content
                        <span className="text-zinc-500 text-xs">(optional)</span>
                    </label>

                    {/* Live stats badge */}
                    {stats && stats.totalDetected > 0 && (
                        <div className="flex items-center gap-3">
                            {stats.mcqCount > 0 && (
                                <div className="flex items-center gap-1 text-[11px] text-violet-400">
                                    <ListChecks className="w-3 h-3" />
                                    <span>{stats.mcqCount} MCQ</span>
                                </div>
                            )}
                            {stats.truefalseCount > 0 && (
                                <div className="flex items-center gap-1 text-[11px] text-blue-400">
                                    <ToggleLeft className="w-3 h-3" />
                                    <span>{stats.truefalseCount} T/F</span>
                                </div>
                            )}
                            {stats.fillBlankCount > 0 && (
                                <div className="flex items-center gap-1 text-[11px] text-amber-400">
                                    <PenLine className="w-3 h-3" />
                                    <span>{stats.fillBlankCount} Fill</span>
                                </div>
                            )}
                            <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                                stats.withoutAnswers === 0
                                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                    : stats.withAnswers === 0
                                        ? 'text-red-400 bg-red-500/10 border-red-500/20'
                                        : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                            }`}>
                                {stats.withoutAnswers === 0 ? (
                                    <CheckCircle className="w-3 h-3" />
                                ) : (
                                    <AlertCircle className="w-3 h-3" />
                                )}
                                <span>{stats.withAnswers}/{stats.totalDetected} answers</span>
                            </div>
                        </div>
                    )}
                </div>

                <p className="text-xs text-zinc-500">
                    Paste your quiz text below — questions, options, and answers are extracted automatically.
                </p>

                {/* Text input */}
                <Textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={`Paste your quiz here...\n\n1. What is the speed of light?\n   a) 300,000 km/s ✅\n   b) 150,000 km/s\n   c) 200,000 km/s\n   d) 100,000 km/s\n\n2. Water boils at 100°C at sea level.\n   True / False\n\nAnswer Key:\n1. A\n2. True`}
                    className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-sm h-64 focus:ring-violet-500/50 placeholder:text-zinc-600"
                />

                {/* Format help toggle */}
                <button
                    type="button"
                    onClick={() => setShowHelp(!showHelp)}
                    className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-400 transition-colors mt-1"
                >
                    <FileText className="w-3 h-3" />
                    <span>Supported formats</span>
                    {showHelp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
            </div>

            {/* Format Help Panel */}
            {showHelp && (
                <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl text-xs text-zinc-400 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-violet-400 font-medium text-[11px] uppercase tracking-wider">
                                <ListChecks className="w-3 h-3" />
                                Multiple Choice
                            </div>
                            <pre className="bg-zinc-950/80 p-3 rounded-lg text-[11px] leading-relaxed text-zinc-300 border border-zinc-800/50">{`1. What is 2+2?
   a) 3
   b) 4 ✅
   c) 5
   d) 6`}</pre>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-blue-400 font-medium text-[11px] uppercase tracking-wider">
                                <ToggleLeft className="w-3 h-3" />
                                True / False
                            </div>
                            <pre className="bg-zinc-950/80 p-3 rounded-lg text-[11px] leading-relaxed text-zinc-300 border border-zinc-800/50">{`11. The sky is blue.
    True / False

Answer Key:
11. True`}</pre>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-zinc-800/50 space-y-1.5 text-[11px] text-zinc-500">
                        <p><span className="text-zinc-400 font-medium">Mark answers:</span> Use ✅ next to the option, <code className="text-zinc-400 bg-zinc-800/50 px-1 rounded">(Correct)</code>, <code className="text-zinc-400 bg-zinc-800/50 px-1 rounded">*a)</code>, or a separate <span className="text-zinc-300">Answer Key</span> section at the end.</p>
                        <p><span className="text-zinc-400 font-medium">Question formats:</span> <code className="text-zinc-400 bg-zinc-800/50 px-1 rounded">1.</code> <code className="text-zinc-400 bg-zinc-800/50 px-1 rounded">1)</code> <code className="text-zinc-400 bg-zinc-800/50 px-1 rounded">Q1.</code> <code className="text-zinc-400 bg-zinc-800/50 px-1 rounded">Question 1:</code></p>
                        <p><span className="text-zinc-400 font-medium">Option formats:</span> <code className="text-zinc-400 bg-zinc-800/50 px-1 rounded">a)</code> <code className="text-zinc-400 bg-zinc-800/50 px-1 rounded">A.</code> <code className="text-zinc-400 bg-zinc-800/50 px-1 rounded">(a)</code> or dash lists <code className="text-zinc-400 bg-zinc-800/50 px-1 rounded">- option</code></p>
                        <p><span className="text-zinc-400 font-medium">Fill-in-blank:</span> Use <code className="text-zinc-400 bg-zinc-800/50 px-1 rounded">___</code> or <code className="text-zinc-400 bg-zinc-800/50 px-1 rounded">[blank]</code> in the question text.</p>
                    </div>
                    <div className="pt-2 border-t border-zinc-800/50 space-y-1.5 text-[11px] text-zinc-500">
                        <p className="text-violet-400 font-medium text-[11px] uppercase tracking-wider mb-1">✨ Math & Science Formulas (LaTeX)</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <p><code className="text-zinc-400 bg-zinc-800/50 px-1 rounded">{'$x^2$'}</code> → superscript</p>
                            <p><code className="text-zinc-400 bg-zinc-800/50 px-1 rounded">{'$H_2O$'}</code> → subscript</p>
                            <p><code className="text-zinc-400 bg-zinc-800/50 px-1 rounded">{'$\\frac{a}{b}$'}</code> → fraction</p>
                            <p><code className="text-zinc-400 bg-zinc-800/50 px-1 rounded">{'$\\sqrt{x}$'}</code> → square root</p>
                            <p><code className="text-zinc-400 bg-zinc-800/50 px-1 rounded">{'$\\vec{F}$'}</code> → vector</p>
                            <p><code className="text-zinc-400 bg-zinc-800/50 px-1 rounded">{'$\\alpha, \\beta$'}</code> → Greek</p>
                            <p><code className="text-zinc-400 bg-zinc-800/50 px-1 rounded">{'$\\ce{H2O}$'}</code> → chemistry</p>
                            <p><code className="text-zinc-400 bg-zinc-800/50 px-1 rounded">{'$\\leq, \\geq$'}</code> → ≤, ≥</p>
                            <p><code className="text-zinc-400 bg-zinc-800/50 px-1 rounded">{'$$...$$'}</code> → display math</p>
                            <p><code className="text-zinc-400 bg-zinc-800/50 px-1 rounded">{'$\\int_a^b f(x)dx$'}</code> → integral</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Errors & Warnings */}
            {errors.length > 0 && (
                <div className={`p-3.5 rounded-xl space-y-2 ${
                    hasBlockingError
                        ? 'bg-red-950/30 border border-red-900/40'
                        : 'bg-amber-950/20 border border-amber-900/30'
                }`}>
                    <div className="flex items-center gap-2">
                        <AlertCircle className={`w-3.5 h-3.5 ${hasBlockingError ? 'text-red-400' : 'text-amber-400'}`} />
                        <span className={`text-xs font-medium ${hasBlockingError ? 'text-red-400' : 'text-amber-400'}`}>
                            {hasBlockingError ? 'Cannot save quiz' : 'Heads up'}
                        </span>
                    </div>
                    <ul className="space-y-1 pl-5">
                        {errors.slice(0, 5).map((err, i) => (
                            <li key={i} className={`text-[11px] list-disc ${err.startsWith('❌') ? 'text-red-300/80' : 'text-amber-300/70'}`}>
                                {err.replace(/^[❌⚠️]\s*/, '')}
                            </li>
                        ))}
                        {errors.length > 5 && <li className="text-[11px] text-zinc-500 list-disc">...and {errors.length - 5} more</li>}
                    </ul>
                </div>
            )}

            {/* Questions Preview */}
            {parsedQuestions.length > 0 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                            <Hash className="w-3.5 h-3.5 text-violet-400" />
                            <span>Preview</span>
                            <span className="text-zinc-500 font-normal">({parsedQuestions.length})</span>
                        </div>
                        {!hasBlockingError && errors.length === 0 && (
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Ready to save</span>
                        )}
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                        {parsedQuestions.map((q) => (
                            <Card key={q.id} className="bg-zinc-900/40 border-zinc-800/60 overflow-hidden">
                                <CardContent className="p-3.5 space-y-2.5">
                                    <div className="flex items-start gap-2">
                                        <span className="text-[11px] text-zinc-500 font-mono bg-zinc-800/50 px-1.5 py-0.5 rounded shrink-0">{q.id}</span>
                                        <p className="text-[13px] font-medium text-zinc-200 leading-relaxed">
                                            <MathText text={q.text} />
                                        </p>
                                        {q.type === 'true_false' && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0 uppercase tracking-wider font-medium">T/F</span>
                                        )}
                                        {q.type === 'fill_blank' && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 uppercase tracking-wider font-medium">Fill</span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        {q.options.map((opt, idx) => (
                                            <div
                                                key={idx}
                                                className={`text-[11px] px-2.5 py-1.5 rounded-lg border flex items-center gap-2 ${
                                                    idx === q.correctAnswerIndex
                                                        ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                                                        : 'bg-zinc-950/50 border-zinc-800/40 text-zinc-400'
                                                }`}
                                            >
                                                <span className={`font-mono text-[10px] shrink-0 ${
                                                    idx === q.correctAnswerIndex ? 'text-emerald-500' : 'text-zinc-600'
                                                }`}>
                                                    {String.fromCharCode(65 + idx)}
                                                </span>
                                                <MathText text={opt} />
                                                {idx === q.correctAnswerIndex && (
                                                    <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0 ml-auto" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {q.correctAnswerIndex === -1 && (
                                        <div className="text-[10px] text-amber-500/70 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            No answer set
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
