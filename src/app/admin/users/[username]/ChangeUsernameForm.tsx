'use client';

import { useState } from 'react';
import { Edit2, Save, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { changeUsername } from '@/app/admin/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ChangeUsernameFormProps {
    currentUsername: string;
}

export function ChangeUsernameForm({ currentUsername }: ChangeUsernameFormProps) {
    const [editing, setEditing] = useState(false);
    const [newUsername, setNewUsername] = useState(currentUsername);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSave = async () => {
        if (!newUsername.trim() || newUsername.trim() === currentUsername) {
            setEditing(false);
            setNewUsername(currentUsername);
            return;
        }

        setLoading(true);
        const result = await changeUsername(currentUsername, newUsername.trim());

        if (result.success && result.newUsername) {
            toast.success(`Username changed to "${result.newUsername}"`);
            router.push(`/admin/users/${encodeURIComponent(result.newUsername)}`);
        } else {
            toast.error(result.error || 'Failed to change username');
            setNewUsername(currentUsername);
        }
        setLoading(false);
        setEditing(false);
    };

    if (!editing) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-zinc-400 font-mono text-sm">@{currentUsername}</span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-zinc-600 hover:text-blue-400 hover:bg-blue-500/10 rounded-md"
                    onClick={() => setEditing(true)}
                    title="Change username"
                >
                    <Edit2 className="w-3 h-3" />
                </Button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 mt-1">
            <span className="text-zinc-500 text-sm">@</span>
            <input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1 text-sm text-white font-mono outline-none focus:ring-2 focus:ring-blue-500 w-[200px]"
                autoFocus
                disabled={loading}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') { setEditing(false); setNewUsername(currentUsername); }
                }}
            />
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-emerald-400 hover:bg-emerald-500/10 rounded-md"
                onClick={handleSave}
                disabled={loading}
            >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md"
                onClick={() => { setEditing(false); setNewUsername(currentUsername); }}
                disabled={loading}
            >
                <X className="w-3.5 h-3.5" />
            </Button>
        </div>
    );
}
