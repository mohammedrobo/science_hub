'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { completeOnboarding } from './submit-onboarding';
import { motion } from 'framer-motion';
import { Sparkles, Trophy, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleComplete = async () => {
        setLoading(true);

        try {
            // Pass 0.0 as default GPA since the feature is removed
            const result = await completeOnboarding();

            if (result.error) {
                console.error("Onboarding Error:", result.error);
                alert(`Error: ${result.error}`); // Force visibility
                toast.error(result.error);
                setLoading(false);
            } else {
                toast.success("Welcome to Science Hub!");
                console.log("Redirecting to dashboard...");
                // Force hard reload to ensure session cookie is picked up by middleware
                window.location.href = '/';
            }
        } catch (err: any) {
            console.error("Client Submission Error:", err);
            alert(`System Error: ${err.message || "Unknown error"}`);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05]" />
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-violet-500/10 via-transparent to-emerald-500/10" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{ willChange: 'transform, opacity' }}
                className="w-full max-w-md relative z-10"
            >
                <Card className="bg-zinc-900 border-zinc-800 shadow-2xl">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                            <Sparkles className="w-6 h-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
                            Welcome to Science Hub
                        </CardTitle>
                        <CardDescription className="text-zinc-400 mt-2">
                            Your academic journey evolves here.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-4">
                        <div className="space-y-4 text-center">
                            <p className="text-zinc-300 leading-relaxed">
                                You are about to enter the <strong>Semester 2</strong> module.
                                Science Hub tracks your performance, quizzes, and ranking dynamically.
                            </p>
                            <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 text-left space-y-2">
                                <div className="flex items-center gap-3">
                                    <Trophy className="w-4 h-4 text-yellow-500" />
                                    <span className="text-sm text-zinc-300">Complete lessons to unlock next ones</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Trophy className="w-4 h-4 text-violet-500" />
                                    <span className="text-sm text-zinc-300">Score 50%+ on quizzes to proceed</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Trophy className="w-4 h-4 text-emerald-500" />
                                    <span className="text-sm text-zinc-300">Compete for the top Class Rank</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter>
                        <Button
                            onClick={handleComplete}
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold"
                        >
                            {loading ? "Setting up..." : "Get Started"}
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}
