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
}

export function QuizUploader({ onQuizDataChange }: QuizUploaderProps) {
    const [rawText, setRawText] = useState('');
    const [parsedQuestions, setParsedQuestions] = useState<QuizQuestion[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [isAiParsing, setIsAiParsing] = useState(false);

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

    const handleAiParse = async () => {
        if (!rawText.trim()) {
            toast.error("Please paste some text first.");
            return;
        }

        setIsAiParsing(true);
        try {
            const result = await parseQuizWithAI(rawText);

            if (result.success && result.questions) {
                setParsedQuestions(result.questions);
                setErrors([]); // Clear errors since AI "fixed" it
                onChangeRef.current({ questions: result.questions });
                toast.success("AI successfully parsed the quiz!");
            } else {
                toast.error(result.error || "AI failed to parse the content.");
            }
        } catch (e) {
            toast.error("An unexpected error occurred.");
            console.error(e);
        } finally {
            setIsAiParsing(false);
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
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAiParse}
                        disabled={isAiParsing || !rawText.trim()}
                        className="bg-violet-500/10 text-violet-300 border-violet-500/50 hover:bg-violet-500/20 hover:text-violet-200 transition-all"
                    >
                        {isAiParsing ? (
                            <>
                                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                AI Parsing...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-3 h-3 mr-2" />
                                Magic Parse (AI)
                            </>
                        )}
                    </Button>
                </div>
                <p className="text-xs text-zinc-500">
                    Paste your quiz below (PDF copy-paste, Word doc, or raw text). The AI will auto-format it.
                </p>
                <Textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={`Paste quiz text here (PDF copy-paste, Word doc, etc)...
Example:
1. What is the speed of light?
a) 300,000 km/s
b) 150,000 km/s
...
Answer: A`}
                    className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-sm h-64 focus:ring-violet-500/50"
                />
            </div>

            {/* ERROR DISPLAY */}
            {errors.length > 0 && (
                <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-red-400 font-medium">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            <span>Parsing Issues Detected</span>
                        </div>
                        <span className="text-xs opacity-75">Try Magic Parse if standard parsing fails</span>
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
