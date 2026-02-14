'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle, BrainCircuit, Sparkles, Loader2 } from 'lucide-react';
import { parseQuizMarkdown, QuizQuestion } from '@/lib/quiz-parser';
import { parseQuizWithAI } from '@/app/admin/actions';
import { toast } from 'sonner';
import { MathText } from '@/components/MathText';

interface QuizUploaderProps {
    onQuizDataChange: (data: { questions: QuizQuestion[] } | null) => void;
    onParsingChange?: (isParsing: boolean) => void;
}

export function QuizUploader({ onQuizDataChange, onParsingChange }: QuizUploaderProps) {
    const [rawText, setRawText] = useState('');
    const [parsedQuestions, setParsedQuestions] = useState<QuizQuestion[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [isAiParsing, setIsAiParsing] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    // Use ref to avoid dependency loop
    const onChangeRef = useRef(onQuizDataChange);
    onChangeRef.current = onQuizDataChange;

    // Standard Regex Parsing (Live Preview)
    useEffect(() => {
        if (!rawText.trim()) {
            setParsedQuestions([]);
            setErrors([]);
            onChangeRef.current(null);
            return;
        }

        // Only run regex parser if we aren't currently waiting for AI
        // This prevents flickering if we add more complex logic later
        const result = parseQuizMarkdown(rawText);
        setParsedQuestions(result.questions);
        setErrors(result.errors);

        if (result.errors.length === 0 && result.questions.length > 0) {
            onChangeRef.current({ questions: result.questions });
        } else {
            onChangeRef.current(null);
        }
    }, [rawText]);

    // Debounced Auto-Parse
    useEffect(() => {
        if (!rawText.trim()) return;

        // Skip if already parsing or if we have a valid regex parse
        // Actually, we want AI to take over if regex fails, or just run AI on paste.
        // Let's debounce the AI call.

        const timeoutId = setTimeout(async () => {
            // Only run AI if standard regex failed or returned no questions
            // OR if the user explicitly wants AI (implied by pasting raw text)
            // For "Auto-Magic", we'll try AI if regex returns nothing USEFUL or if it looks messy.
            // Simplest approach: Always trying AI is expensive. 
            // Better approach: Try regex first. If 0 questions or errors, try AI.
            // The prompt implies "instead of a button... make it auto".

            // Let's try standard regex first inside this debounce
            const regexResult = parseQuizMarkdown(rawText);

            if (regexResult.questions.length > 0 && regexResult.errors.length === 0) {
                // Standard format works! No need for AI.
                return;
            }

            // If standard format failed, TRIGGER AI
            setIsAiParsing(true);
            setAiError(null);
            onParsingChange?.(true); // Notify parent

            try {
                const result = await parseQuizWithAI(rawText);
                if ('error' in result) {
                    const errMsg = result.error as string;
                    console.warn("AI Parse failed:", errMsg);
                    setAiError(errMsg);
                    toast.error('AI Parse Failed: ' + errMsg);
                } else if (result.questions && (result.questions as QuizQuestion[]).length > 0) {
                    setParsedQuestions(result.questions as QuizQuestion[]);
                    setErrors((result as { warnings?: string[] }).warnings || []);
                    onChangeRef.current({ questions: result.questions as QuizQuestion[] });
                    setAiError(null);
                    const warningCount = (result as { warnings?: string[] }).warnings?.length || 0;
                    toast.success(
                        warningCount > 0
                            ? `AI parsed ${(result.questions as QuizQuestion[]).length} questions (${warningCount} warnings)`
                            : `AI successfully parsed ${(result.questions as QuizQuestion[]).length} questions!`
                    );
                } else {
                    setAiError('AI could not extract any questions from the text. Try reformatting.');
                    toast.error('AI could not extract questions. Try reformatting the text.');
                }
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'Unknown error';
                console.error('AI Parse error:', e);
                setAiError(msg);
                toast.error('AI Parse Error: ' + msg);
            } finally {
                setIsAiParsing(false);
                onParsingChange?.(false);
            }
        }, 1500); // 1.5s debounce

        return () => clearTimeout(timeoutId);
    }, [rawText, onParsingChange]);

    const handleAiParse = async () => {
        if (!rawText.trim() || isAiParsing) return;
        setIsAiParsing(true);
        setAiError(null);
        onParsingChange?.(true);
        try {
            const result = await parseQuizWithAI(rawText);
            if ('error' in result) {
                setAiError(result.error as string);
                toast.error('AI Parse Failed: ' + result.error);
            } else if (result.questions && (result.questions as QuizQuestion[]).length > 0) {
                setParsedQuestions(result.questions as QuizQuestion[]);
                setErrors((result as { warnings?: string[] }).warnings || []);
                onChangeRef.current({ questions: result.questions as QuizQuestion[] });
                setAiError(null);
                toast.success(`AI parsed ${(result.questions as QuizQuestion[]).length} questions!`);
            } else {
                setAiError('AI returned no questions.');
                toast.error('No questions extracted.');
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Unknown error';
            setAiError(msg);
            toast.error('AI error: ' + msg);
        } finally {
            setIsAiParsing(false);
            onParsingChange?.(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4 text-violet-400" />
                        Quiz Content
                    </label>

                    {/* Status Indicator */}
                    <div className="flex items-center gap-2">
                        {isAiParsing ? (
                            <div className="flex items-center gap-2 text-xs text-violet-300 bg-violet-500/10 px-3 py-1.5 rounded-full border border-violet-500/20">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>AI Parsing...</span>
                            </div>
                        ) : aiError ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleAiParse}
                                className="h-7 text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-3 rounded-full"
                            >
                                <Sparkles className="w-3 h-3 mr-1" />
                                Retry AI Parse
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-800/50 px-3 py-1.5 rounded-full border border-zinc-800">
                                <Sparkles className="w-3 h-3 text-violet-400" />
                                <span>Auto-Magic Parse</span>
                            </div>
                        )}
                    </div>
                </div>
                <p className="text-xs text-zinc-500">
                    Paste the AI-generated markdown exam here (ChatGPT, Gemini, Claude). The parser auto-strips conversational text.
                </p>
                <Textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={`Paste AI-generated exam markdown here...

The parser will automatically remove greetings, closings,
section headers, and extract only the questions & answers.

Example:
1. What is the speed of light?
a) 300,000 km/s ✅
b) 150,000 km/s
c) 200,000 km/s
d) 100,000 km/s`}
                    className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-sm h-64 focus:ring-violet-500/50"
                />
            </div>

            {/* AI ERROR DISPLAY */}
            {aiError && (
                <div className="p-4 bg-amber-900/20 border border-amber-900/50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-400 font-medium">
                            <AlertCircle className="w-4 h-4" />
                            <span>AI Parse Failed</span>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleAiParse}
                            disabled={isAiParsing}
                            className="h-7 text-xs text-amber-300 hover:text-amber-200"
                        >
                            {isAiParsing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                            Retry
                        </Button>
                    </div>
                    <p className="text-xs text-amber-300/80">{aiError}</p>
                    <p className="text-xs text-zinc-500">The standard parser will still try to extract questions. You can also reformat your text and paste again.</p>
                </div>
            )}

            {/* REGEX PARSING ERRORS */}
            {errors.length > 0 && !aiError && (
                <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-red-400 font-medium">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            <span>Parsing Issues Detected</span>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleAiParse}
                            disabled={isAiParsing}
                            className="h-7 text-xs text-violet-300 hover:text-violet-200"
                        >
                            {isAiParsing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                            Try AI Parse
                        </Button>
                    </div>
                    <ul className="list-disc list-inside text-xs text-red-300 space-y-1">
                        {errors.slice(0, 3).map((err, i) => (
                            <li key={i}>{err}</li>
                        ))}
                        {errors.length > 3 && <li>...and {errors.length - 3} more errors.</li>}
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
                        {errors.length === 0 && <span className="text-xs bg-emerald-500/10 px-2 py-1 rounded">Valid</span>}
                    </div>

                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                        {parsedQuestions.map((q) => (
                            <Card key={q.id} className="bg-zinc-900/50 border-zinc-800">
                                <CardContent className="p-4 space-y-3">
                                    <p className="text-sm font-medium text-zinc-200">
                                        <span className="text-zinc-500 mr-2">{q.id}.</span>
                                        <MathText text={q.text} />
                                    </p>
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
