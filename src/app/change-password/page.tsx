'use client';

import { changePassword } from './actions';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

const initialState = {
    error: '',
};

export default function ChangePasswordPage() {
    const [state, formAction, isPending] = useActionState(changePassword, initialState);
    const t = useTranslations('changePassword');

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 p-4">
            <div className="w-full max-w-md bg-zinc-900/50 border border-yellow-500/20 rounded-2xl p-8 shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 start-0 w-full h-1 bg-yellow-500/50" />

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                        <ShieldAlert className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">{t('securityUpdate')}</h1>
                        <p className="text-zinc-400 text-sm">{t('changeTempPassword')}</p>
                    </div>
                </div>

                <form action={formAction} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="new_password">{t('newPassword')}</Label>
                        <Input
                            id="new_password"
                            name="new_password"
                            type="password"
                            required
                            minLength={8}
                            placeholder={t('newPasswordPlaceholder')}
                            className="bg-black/40 border-zinc-700"
                        />
                        <p className="text-[11px] text-zinc-500">{t('requirements')}</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm_password">{t('confirmPassword')}</Label>
                        <Input
                            id="confirm_password"
                            name="confirm_password"
                            type="password"
                            required
                            minLength={8}
                            placeholder={t('repeatPasswordPlaceholder')}
                            className="bg-black/40 border-zinc-700"
                        />
                    </div>

                    {state?.error && (
                        <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                            {state.error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-yellow-600 hover:bg-yellow-500 text-white"
                        disabled={isPending}
                    >
                        {isPending ? t('updating') : t('updatePassword')}
                    </Button>
                </form>
            </div>
        </div>
    );
}
