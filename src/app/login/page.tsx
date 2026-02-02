'use client';

import { login } from './actions';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const initialState = {
    error: '',
};

export default function LoginPage() {
    const [state, formAction, isPending] = useActionState(login, initialState);

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.1),transparent_50%)] pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-50" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md p-8 relative z-10"
            >
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl shadow-violet-500/10">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-500/10 mb-4 border border-violet-500/20">
                            <Sparkles className="w-6 h-6 text-violet-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">SYSTEM ACCESS</h1>
                        <p className="text-zinc-400 text-sm">Enter your Identity Code to initialize.</p>
                    </div>

                    <form action={formAction} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-zinc-300">Username</Label>
                            <Input
                                id="username"
                                name="username"
                                type="text"
                                required
                                placeholder="A_A1-1-0444"
                                className="bg-zinc-950/50 border-zinc-700 text-white focus:border-violet-500 focus:ring-violet-500/20 placeholder:text-zinc-600 font-mono"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-zinc-300">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                placeholder="••••••••"
                                className="bg-zinc-950/50 border-zinc-700 text-white focus:border-violet-500 focus:ring-violet-500/20 placeholder:text-zinc-600"
                            />
                        </div>

                        {state?.error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20"
                            >
                                {state.error}
                            </motion.div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-11 bg-violet-600 hover:bg-violet-500 text-white font-medium shadow-lg shadow-violet-500/25 transition-all hover:scale-[1.02]"
                            disabled={isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Initializing...
                                </>
                            ) : (
                                <>
                                    Initialize System
                                    <ArrowRight className="ml-2 h-4 w-4 opacity-70" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-xs text-zinc-500">
                        <p>Protected by Class S Security</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
