'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle, BrainCircuit, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { parseQuizMarkdown, QuizQuestion } from '@/lib/quiz-parser';
import { MathText } from '@/components/MathText';

interface QuizUploaderProps {
    onQuizDataChange: (data: { questions: QuizQuestion[] } | null) => void;
}

export function QuizUploader({ onQuizDataChange }: QuizUploaderProps) {
    const [rawText, setRawText] = useState('');
    const [parsedQuestions, setParsedQuestions] = useState<QuizQuestion[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [showHelp, setShowHelp] = useState(false);
    const [stats, setStats] = useState<{ totalDetected: number; withAnswers: number; withoutAnswers: number; truefalseCount: number; mcqCount: number } | null>(null);

    const onChangeRef = useRef(onQuizDataChange);
    onChangeRef.current = onQuizDataChange;

    // Live Regex Parsing
    useEffect(() => {
        if (!rawText.trim()) {
            setParsedQuestions([]);
            setErrors([]);
            setStats(null);
            onChangeRef.current(null);
            return;
        }

        const result = parseQuizMarkdown(rawText);
        setParsedQuestions(result.questions);
        setErrors(result.errors);
        setStats(result.stats);

        if (result.errors.length === 0 && result.questions.length > 0) {
            onChangeRef.current({ questions: result.questions });
        } else if (result.questions.length > 0 && !result.errors.some(e => e.startsWith('❌'))) {
            // Still pass questions even with warnings (missing answers)
            onChangeRef.current({ questions: result.questions });
        } else {
            onChangeRef.current(null);
        }
    }, [rawText]);

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4 text-violet-400" />
                        Quiz Content
                        <span className="text-zinc-500 text-xs">(optional)</span>
                    </label>

                    {/* Status Indicator */}
                    <div className="flex items-center gap-2">
                        {stats && stats.totalDetected > 0 ? (
                            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                                <CheckCircle className="w-3 h-3" />
                                <span>
                                    {stats.withAnswers}/{stats.totalDetected} answers
                                    {stats.truefalseCount > 0 && ` · ${stats.truefalseCount} T/F`}
                                    {stats.mcqCount > 0 && ` · ${stats.mcqCount} MCQ`}
                                </span>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowHelp(!showHelp)}
                                className="flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-800/50 px-3 py-1.5 rounded-full border border-zinc-800 hover:border-zinc-700 hover:text-zinc-400 transition-colors"
                            >
                                <HelpCircle className="w-3 h-3" />
                                <span>Format Help</span>
                                {showHelp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Format Help */}
                {showHelp && (
                    <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs text-zinc-400 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <p className="text-zinc-300 font-medium">Supported Formats:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <p className="text-violet-400 font-medium mb-1">MCQ (Multiple Choice)</p>
                                <pre className="bg-zinc-950 p-2 rounded text-[11px] leading-relaxed">{`1. What is 2+2?
   a) 3
   b) 4 ✅
   c) 5
   d) 6`}</pre>
                            </div>
                            <div>
                                <p className="text-violet-400 font-medium mb-1">True/False</p>
                                <pre className="bg-zinc-950 p-2 rounded text-[11px] leading-relaxed">{`11. The sky is blue.
   True / False

Answer Key:
11. True`}</pre>
                            </div>
                        </div>
                        <p className="text-zinc-500">
                            ✅ Answer markers: <code className="text-zinc-400">✅</code>, <code className="text-zinc-400">(Correct)</code>, <code className="text-zinc-400">*a)</code>, <code className="text-zinc-400">[x]</code>, or a separate <strong>Answer Key</strong> section.
                            Supports LaTeX: <code className="text-zinc-400">{'$x^2$'}</code>. Paste directly from ChatGPT, Gemini, or Claude — noise is auto-stripped.
                        </p>
                    </div>
                )}

                <p className="text-xs text-zinc-500">
                    Paste your exam markdown here. Questions, options, and answers are extracted automatically — no AI needed.
                </p>
                <Textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={`Paste exam markdown here (from ChatGPT, Gemini, Claude, or manual)...

Example:
1. What is the speed of light?
   a) 300,000 km/s ✅
   b) 150,000 km/s
   c) 200,000 km/s
   d) 100,000 km/s

2. Water boils at 100°C at sea level.
   True / False

Answer Key:
1. A
2. True`}
                    className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-sm h-64 focus:ring-violet-500/50"
                />
            </div>

            {/* PARSING ERRORS/WARNINGS */}
            {errors.length > 0 && (
                <div className={`p-4 rounded-lg space-y-2 ${errors.some(e => e.startsWith('❌'))
                    ? 'bg-red-900/20 border border-red-900/50'
                    : 'bg-amber-900/20 border border-amber-900/50'
                    }`}>
                    <div className="flex items-center gap-2 font-medium">
                        <AlertCircle className={`w-4 h-4 ${errors.some(e => e.startsWith('❌')) ? 'text-red-400' : 'text-amber-400'}`} />
                        <span className={errors.some(e => e.startsWith('❌')) ? 'text-red-400' : 'text-amber-400'}>
                            {errors.some(e => e.startsWith('❌')) ? 'Parsing Error' : 'Warnings'}
                        </span>
                    </div>
                    <ul className="list-disc list-inside text-xs space-y-1">
                        {errors.slice(0, 5).map((err, i) => (
                            <li key={i} className={err.startsWith('❌') ? 'text-red-300' : 'text-amber-300'}>{err}</li>
                        ))}
                        {errors.length > 5 && <li className="text-zinc-500">...and {errors.length - 5} more.</li>}
                    </ul>
                </div>
            )}

            {/* PREVIEW */}
            {parsedQuestions.length > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between text-emerald-400 font-medium">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            <span>Preview ({parsedQuestions.length} Questions)</span>
                        </div>
                        {errors.length === 0 && <span className="text-xs bg-emerald-500/10 px-2 py-1 rounded">✓ All Valid</span>}
                    </div>

                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                        {parsedQuestions.map((q) => (
                            <Card key={q.id} className="bg-zinc-900/50 border-zinc-800">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-start gap-2">
                                        <span className="text-zinc-500 text-sm font-mono shrink-0">{q.id}.</span>
                                        <p className="text-sm font-medium text-zinc-200">
                                            <MathText text={q.text} />
                                        </p>
                                        {q.type === 'true_false' && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">T/F</span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {q.options.map((opt, idx) => (
                                            <div
                                                key={idx}
                                                className={`text-xs p-2 rounded border ${idx === q.correctAnswerIndex
                                                    ? 'bg-emerald-900/20 border-emerald-900/50 text-emerald-300'
                                                    : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                                                    }`}
                                            >
                                                <span className="font-mono mr-2 opacity-50">
                                                    {String.fromCharCode(97 + idx)})
                                                </span>
                                                <MathText text={opt} />
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
