'use client';

import { changePassword } from './actions'; // FIXED: Import from local actions file
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldAlert } from 'lucide-react';

const initialState = {
    error: '',
};

export default function ChangePasswordPage() {
    const [state, formAction, isPending] = useActionState(changePassword, initialState);

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 p-4">
            <div className="w-full max-w-md bg-zinc-900/50 border border-yellow-500/20 rounded-2xl p-8 shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500/50" />

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                        <ShieldAlert className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Security Update</h1>
                        <p className="text-zinc-400 text-sm">Please change your temporary password.</p>
                    </div>
                </div>

                <form action={formAction} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="new_password">New Password</Label>
                        <Input
                            id="new_password"
                            name="new_password"
                            type="password"
                            required
                            minLength={6}
                            placeholder="Enter new secure password"
                            className="bg-black/40 border-zinc-700"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm_password">Confirm Password</Label>
                        <Input
                            id="confirm_password"
                            name="confirm_password"
                            type="password"
                            required
                            minLength={6}
                            placeholder="Repeat password"
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
                        {isPending ? 'Updating...' : 'Update Password'}
                    </Button>
                </form>
            </div>
        </div>
    );
}
