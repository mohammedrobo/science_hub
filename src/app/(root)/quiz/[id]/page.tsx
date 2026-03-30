'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { submitQuizResult } from '@/app/actions/progress';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, ChevronRight, Trophy, RotateCcw, ArrowLeft, Loader2, Check, X } from 'lucide-react';
import { cn, getGrade } from '@/lib/utils';
import Link from 'next/link';
import { MathText } from '@/components/MathText';
import { useTranslations } from 'next-intl';
import { examModeValue } from '@/lib/exam-mode';
import { toast } from 'sonner';

const QUIZ_CACHE_TTL_MS = examModeValue(
    60 * 60 * 1000,
    6 * 60 * 60 * 1000
); // 1h normal, 6h exam mode

function getQuizCacheKey(quizId: string): string {
    return `quiz_data_v1_${quizId}`;
}

function readQuizCache(quizId: string): QuizData | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(getQuizCacheKey(quizId));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { ts?: number; data?: QuizData };
        if (!parsed?.ts || !parsed?.data) return null;
        if ((Date.now() - parsed.ts) > QUIZ_CACHE_TTL_MS) return null;
        return parsed.data;
    } catch {
        return null;
    }
}

function writeQuizCache(quizId: string, data: QuizData) {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(
            getQuizCacheKey(quizId),
            JSON.stringify({ ts: Date.now(), data })
        );
    } catch {
        // Ignore cache write failures
    }
}

// Types for our Real Data
interface Question {
    id: string;
    text: string;
    options: string[];
    correct_answer: string;
}

interface QuizData {
    id: string;
    title: string;
    description: string;
    course_id: string;
    questions: Question[];
}

export default function QuizPage() {
    const params = useParams();
    const router = useRouter();
    const rawId = params?.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId as string;
    const t = useTranslations('quiz');

    const [quiz, setQuiz] = useState<QuizData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Gameplay State
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({}); // Index -> Answer Text
    const [isCompleted, setIsCompleted] = useState(false);
    const [quizResult, setQuizResult] = useState<{ xpEarned: number, totalXp: number, quizXp?: number, lessonXp?: number } | null>(null);

    // Standard letter mapping for display
    const LETTERS = ['a', 'b', 'c', 'd'];

    // Fetch Data on Mount
    useEffect(() => {
        const loadQuiz = async () => {
            try {
                const cached = readQuizCache(id);
                if (cached) {
                    setQuiz(cached);
                    return;
                }

                const response = await fetch(`/api/quiz/${id}`, { cache: 'force-cache' });
                if (!response.ok) {
                    setError(t('missionCorrupted'));
                    return;
                }

                const data = await response.json();
                setQuiz(data);
                writeQuizCache(id, data);
            } catch (err) {
                console.error(err);
                setError(t('connectionFailed'));
            } finally {
                setLoading(false);
            }
        };
        loadQuiz();
    }, [id, t]);

    // Handle Score Submission
    useEffect(() => {
        if (isCompleted && !quizResult && quiz) {
            const calculateAndSubmit = async () => {
                let correctCount = 0;
                quiz.questions.forEach((q, idx) => {
                    const ans = userAnswers[idx];
                    if (ans === q.correct_answer) {
                        correctCount++;
                    }
                });

                const percentage = Math.round((correctCount / quiz.questions.length) * 100);

                try {
                    const result = await submitQuizResult(quiz.id, percentage);
                    if (result.success || result.xpEarned !== undefined) {
                        setQuizResult({
                            xpEarned: result.xpEarned || 0,
                            totalXp: result.xpEarned || 0,
                            quizXp: result.quizXp || 0,
                            lessonXp: result.lessonXp || 0
                        });
                        if (result.message) {
                            toast.success(result.message);
                        }
                    }
                } catch (e) {
                    console.error("Failed to submit quiz", e);
                    toast.error(t('connectionFailed'));
                }
            };
            calculateAndSubmit();
        }
    }, [isCompleted, quiz, quizResult, userAnswers]);

    // Keep selected answer in sync when navigating between questions
    useEffect(() => {
        setSelectedAnswer(userAnswers[currentQuestionIndex] ?? null);
    }, [currentQuestionIndex, userAnswers]);

    // ---------------- RENDER LOADING ----------------
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-zinc-500 animate-pulse">{t('initializingSimulation')}</p>
            </div>
        );
    }

    // ---------------- RENDER ERROR ----------------
    if (error || !quiz) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
                <div className="bg-red-500/10 p-6 rounded-full mb-6">
                    <AlertCircle className="w-12 h-12 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">{t('missionFailure')}</h1>
                <p className="text-zinc-400 max-w-md mb-8">{error || "Unknown Error"}</p>
                <Button onClick={() => router.back()} variant="outline">{t('abortReturn')}</Button>
            </div>
        );
    }

    // ---------------- HANDLERS ----------------

    const handleAnswerSelect = (option: string) => {
        setSelectedAnswer(option);
    };

    const handleNextQuestion = () => {
        if (selectedAnswer) {
            setUserAnswers(prev => ({
                ...prev,
                [currentQuestionIndex]: selectedAnswer
            }));
        }

        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
        } else {
            setIsCompleted(true);
        }
    };

    const handlePrevQuestion = () => {
        if (selectedAnswer) {
            setUserAnswers(prev => ({
                ...prev,
                [currentQuestionIndex]: selectedAnswer
            }));
        }

        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleRetry = () => {
        setCurrentQuestionIndex(0);
        setSelectedAnswer(null);
        setUserAnswers({});
        setIsCompleted(false);
        setQuizResult(null);
    };

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex) / quiz.questions.length) * 100;

    // ---------------- RENDER RESULTS (CORRECTION REPORT) ----------------
    if (isCompleted) {
        let correctCount = 0;
        quiz.questions.forEach((q, idx) => {
            if (userAnswers[idx] === q.correct_answer) correctCount++;
        });

        const percentage = Math.round((correctCount / quiz.questions.length) * 100);
        const { grade, color, label } = getGrade(percentage);

        return (
            <div className="container max-w-4xl mx-auto py-10 px-4 space-y-8">
                    {/* SUMMARY CARD */}
                    <div
                        className="border border-zinc-800 bg-zinc-900/50 p-8 rounded-2xl relative overflow-hidden text-center"
                        style={{ animation: 'scaleIn 0.4s ease-out forwards' }}
                    >
                    <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
                    <div className="relative z-10">
                        <Trophy className={`w-16 h-16 mx-auto mb-4 ${percentage >= 80 ? 'text-yellow-400' : 'text-primary'}`} />
                        <h1 className="text-3xl font-bold mb-2">{t('missionComplete')}</h1>
                        <div className={`text-5xl font-black mb-4 ${color} tracking-wider font-mono`}>{grade} <span className="text-2xl opacity-50 block mt-1">{label}</span></div>
                        <p className="text-zinc-400 text-lg mb-4">
                            Score: <span className="text-white font-bold">{correctCount}</span> / {quiz.questions.length} ({percentage}%)
                        </p>

                        {quizResult && (
                            <div className="flex flex-col items-center justify-center gap-1 mb-6 text-sm bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50 max-w-sm mx-auto shadow-inner">
                                <div className="text-zinc-300 w-full flex justify-between px-2">
                                    <span>{t('quizReward') || 'Quiz Reward'}:</span>
                                    <span className="text-yellow-400 font-bold">+{quizResult.quizXp} XP</span>
                                </div>
                                {quizResult.lessonXp !== undefined && quizResult.lessonXp > 0 && (
                                    <div className="text-zinc-300 w-full flex justify-between px-2">
                                        <span>{t('lectureReward') || 'Lecture Complete'}:</span>
                                        <span className="text-emerald-400 font-bold">+{quizResult.lessonXp} XP</span>
                                    </div>
                                )}
                                <div className="text-zinc-100 font-bold mt-2 pt-2 border-t border-zinc-700/50 w-full flex justify-between px-2">
                                    <span>{t('totalGained') || 'Total Gained'}:</span>
                                    <span className="text-violet-400 text-base">+{quizResult.totalXp} XP</span>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-4 justify-center">
                            <Button onClick={handleRetry} variant="outline" className="h-10">
                                <RotateCcw className="me-2 w-4 h-4" /> {t('replay')}
                            </Button>
                            <Button onClick={() => router.push(`/course/${quiz.course_id}`)} className="h-10">
                                {t('returnToCourse')}
                            </Button>
                        </div>
                    </div>
                    </div>

                {/* CORRECTION REPORT */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        {t('missionDebrief')}
                    </h2>

                    {quiz.questions.map((q, idx) => {
                        const userAnswer = userAnswers[idx];
                        const isCorrect = userAnswer === q.correct_answer;

                        return (
                            <Card key={q.id} className={cn("bg-zinc-900 border-zinc-800 transition-all", isCorrect ? "border-emerald-900/30" : "border-red-900/30")}>
                                <CardHeader className="py-4">
                                    <h3 className="text-base font-medium text-zinc-200 flex items-start gap-3">
                                        <span className="text-zinc-500 font-mono mt-0.5">#{idx + 1}</span>
                                        <MathText text={q.text} />
                                    </h3>
                                </CardHeader>
                                <CardContent className="pb-4 pt-0 pl-11 space-y-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {/* User Answer */}
                                        <div className={cn(
                                            "p-3 rounded-md text-sm border flex items-center justify-between",
                                            isCorrect
                                                ? "bg-emerald-950/20 border-emerald-900/50 text-emerald-300"
                                                : "bg-red-950/20 border-red-900/50 text-red-300"
                                        )}>
                                            <div className="flex flex-col">
                                                <span className="text-xs opacity-70 mb-1">{t('yourAnswer')}</span>
                                                <span className="font-medium"><MathText text={userAnswer || t('skipped')} /></span>
                                            </div>
                                            {isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                        </div>

                                        {/* Correct Answer (if wrong) */}
                                        {!isCorrect && (
                                            <div className="p-3 rounded-md text-sm border border-emerald-900/50 bg-emerald-950/20 text-emerald-300 flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-xs opacity-70 mb-1">{t('correctAnswer')}</span>
                                                    <span className="font-medium"><MathText text={q.correct_answer} /></span>
                                                </div>
                                                <Check className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
                </div>
        );
    }

    // ---------------- RENDER GAMEPLAY ----------------
    return (
        <div className="container max-w-3xl mx-auto py-6 sm:py-10 px-3 sm:px-4">
                <div className="mb-8 space-y-4">
                <Link href={`/course/${quiz.course_id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
                    <ArrowLeft className="w-4 h-4 me-1" />
                    {t('abortMission')}
                </Link>

                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">{quiz.title}</h1>
                        <p className="text-muted-foreground text-sm max-w-xl">{quiz.description || t('completeAllQuestions')}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-bold text-primary">Q{currentQuestionIndex + 1}</span>
                        <span className="text-muted-foreground">/{quiz.questions.length}</span>
                    </div>
                </div>

                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                        className="h-full w-full bg-primary shadow-[0_0_10px_var(--color-primary)] transition-transform duration-500 ease-out origin-left"
                        style={{ transform: `scaleX(${progress / 100})` }}
                    />
                </div>
                </div>

            <div
                key={currentQuestion.id}
                style={{ animation: 'slideIn 0.2s ease-out forwards' }}
            >
                    <Card className="border-zinc-800 bg-zinc-900 overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
                        <CardHeader className="pb-4">
                            <h2 className="text-lg md:text-xl font-medium leading-relaxed text-zinc-100">
                                <MathText text={currentQuestion.text} />
                            </h2>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {currentQuestion.options.map((option, idx) => {
                                const isSelected = selectedAnswer === option;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleAnswerSelect(option)}
                                        className={cn(
                                            "w-full text-left p-4 rounded-lg border transition-all flex items-center justify-between group active:scale-[0.99]",
                                            isSelected
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-zinc-800 bg-zinc-950/30 text-zinc-400 hover:border-primary/50 hover:bg-zinc-900"
                                        )}
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className={cn(
                                                "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold border",
                                                isSelected ? "border-current opacity-100" : "border-zinc-700 text-zinc-500"
                                            )}>
                                                {LETTERS[idx].toUpperCase()}
                                            </span>
                                            <span className="font-medium"><MathText text={option} /></span>
                                        </span>
                                    </button>
                                );
                            })}
                        </CardContent>
                        <CardFooter className="pt-2 pb-6">
                            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center pt-4">
                                <Button
                                    onClick={handlePrevQuestion}
                                    disabled={currentQuestionIndex === 0}
                                    variant="outline"
                                    className="w-full sm:w-auto h-12 px-6"
                                >
                                    <ArrowLeft className="me-2 w-4 h-4" /> {t('previousQuestion')}
                                </Button>
                                <Button
                                    onClick={handleNextQuestion}
                                    disabled={!selectedAnswer}
                                    className="w-full sm:w-auto h-12 px-6 bg-primary hover:bg-primary/90 text-white font-bold sm:ml-auto"
                                >
                                    {currentQuestionIndex < quiz.questions.length - 1 ? t('nextQuestion') : t('completeMission')} <ChevronRight className="ms-2 w-4 h-4" />
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
            </div>
    );
}
