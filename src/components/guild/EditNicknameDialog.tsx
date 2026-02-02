'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { UserCog } from 'lucide-react';
import { updateUserNickname } from '@/app/guild/actions';
import { toast } from 'sonner';

export function EditNicknameDialog({ currentUser, currentNickname }: { currentUser: string, currentNickname?: string }) {
    const [open, setOpen] = useState(false);
    const [nickname, setNickname] = useState(currentNickname || '');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const res = await updateUserNickname(currentUser, nickname);
        setIsLoading(false);

        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success("Nickname updated successfully!");
            setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-violet-400 hover:border-violet-900/50">
                    <UserCog className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Edit Profile</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-900 text-zinc-100 sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Your Identity</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSave} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Nickname</label>
                        <Input
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Enter your nickname..."
                            className="bg-zinc-900 border-zinc-800"
                        />
                        <p className="text-[10px] text-zinc-500">
                            This name will replace your full name in the Guild Hall.
                        </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isLoading} className="bg-violet-600 hover:bg-violet-500">
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
