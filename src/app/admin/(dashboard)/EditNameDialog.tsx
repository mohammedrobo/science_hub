'use client';

import { useState, useTransition, useEffect } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
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
import { updateStudentName } from '../actions';

interface EditNameDialogProps {
    username: string;
    currentName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditNameDialog({ username, currentName, open, onOpenChange }: EditNameDialogProps) {
    const [name, setName] = useState(currentName);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (open) setName(currentName);
    }, [open, currentName]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed || trimmed.length < 3) {
            toast.error('Name must be at least 3 characters');
            return;
        }
        if (trimmed === currentName) {
            onOpenChange(false);
            return;
        }

        startTransition(async () => {
            try {
                const result = await updateStudentName(username, trimmed);
                if ('error' in result) {
                    toast.error(result.error);
                } else {
                    toast.success(`Name updated to "${trimmed}"`);
                    onOpenChange(false);
                }
            } catch {
                toast.error('Failed to update name');
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        <Pencil className="w-5 h-5 text-blue-400" />
                        Edit Student Name
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Update the display name for @{username}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm text-zinc-400">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-right placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                            dir="rtl"
                            autoFocus
                            disabled={isPending}
                        />
                    </div>

                    {name.trim() !== currentName && name.trim().length >= 3 && (
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <div className="text-xs text-blue-400 mb-1">Preview change:</div>
                            <div className="flex items-center gap-3 text-sm" dir="rtl">
                                <span className="text-zinc-500 line-through">{currentName}</span>
                                <span className="text-zinc-600">→</span>
                                <span className="text-white font-medium">{name.trim()}</span>
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
                            disabled={isPending || name.trim().length < 3 || name.trim() === currentName}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Name'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
