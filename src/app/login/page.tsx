'use client';

import { login } from './actions';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const initialState = {
    error: '',
};

export default function LoginPage() {
    const [state, formAction, isPending] = useActionState(login, initialState);
    const t = useTranslations('auth');
    const tc = useTranslations('common');

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.1),transparent_50%)] pointer-events-none" />
            <div className="absolute top-0 start-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-50" />

            {/* Language Switcher */}
            <div className="absolute top-4 end-4 z-20">
                <LanguageSwitcher />
            </div>

            <div className="w-full max-w-md p-8 relative z-10">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl shadow-violet-500/10 hover:shadow-violet-500/20 transition-shadow duration-300">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-500/10 mb-4 border border-violet-500/20">
                            <Sparkles className="w-6 h-6 text-violet-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">{t('systemAccess')}</h1>
                        <p className="text-zinc-400 text-sm">{t('enterIdentity')}</p>
                    </div>

                    <form action={formAction} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-zinc-300">{t('username')}</Label>
                            <Input
                                id="username"
                                name="username"
                                type="text"
                                required
                                placeholder={t('usernamePlaceholder')}
                                className="bg-zinc-950/50 border-zinc-700 text-white focus:border-violet-500 focus:ring-violet-500/20 placeholder:text-zinc-600 font-mono transition-all duration-200"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-zinc-300">{t('password')}</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                placeholder={t('passwordPlaceholder')}
                                className="bg-zinc-950/50 border-zinc-700 text-white focus:border-violet-500 focus:ring-violet-500/20 placeholder:text-zinc-600 transition-all duration-200"
                            />
                        </div>

                        {state?.error && (
                            <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                                {state.error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-11 bg-violet-600 hover:bg-violet-500 text-white font-medium shadow-lg shadow-violet-500/25 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-violet-500/30 active:scale-[0.98]"
                            disabled={isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                                    {t('initializing')}
                                </>
                            ) : (
                                <>
                                    {t('initializeSystem')}
                                    <ArrowRight className="ms-2 h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-xs text-zinc-500">
                        <p>{tc('protectedBy')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
