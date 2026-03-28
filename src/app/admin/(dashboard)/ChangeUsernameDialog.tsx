'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AtSign, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { changeUsername } from '../actions';

interface ChangeUsernameDialogProps {
    username: string;
    fullName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ChangeUsernameDialog({ username, fullName, open, onOpenChange }: ChangeUsernameDialogProps) {
    const router = useRouter();
    const [newUsername, setNewUsername] = useState(username);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (open) setNewUsername(username);
    }, [open, username]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newUsername.trim();
        if (!trimmed || trimmed.length < 2) {
            toast.error('Username must be at least 2 characters');
            return;
        }
        if (trimmed === username) {
            onOpenChange(false);
            return;
        }

        startTransition(async () => {
            try {
                const result = await changeUsername(username, trimmed);
                if ('error' in result && result.error) {
                    toast.error(result.error);
                } else {
                    toast.success(`Username changed to "${trimmed}"`);
                    onOpenChange(false);
                    router.refresh();
                }
            } catch {
                toast.error('Failed to change username');
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        <AtSign className="w-5 h-5 text-cyan-400" />
                        Change Username
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Update the username for {fullName}. This will cascade across all data.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm text-zinc-400">New Username</label>
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-500">@</span>
                            <input
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white font-mono placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                                autoFocus
                                disabled={isPending}
                            />
                        </div>
                    </div>

                    {newUsername.trim() !== username && newUsername.trim().length >= 2 && (
                        <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                            <div className="text-xs text-cyan-400 mb-1">Preview change:</div>
                            <div className="flex items-center gap-3 text-sm font-mono">
                                <span className="text-zinc-500 line-through">@{username}</span>
                                <span className="text-zinc-600">→</span>
                                <span className="text-white font-medium">@{newUsername.trim()}</span>
                            </div>
                            <div className="text-[11px] text-amber-400 mt-2">
                                ⚠ This updates all tables: progress, notifications, messages, etc.
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isPending}
                            className="text-zinc-400 hover:text-zinc-200"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending || newUsername.trim().length < 2 || newUsername.trim() === username}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                'Change Username'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
