'use client';

import { useState } from 'react';
import { createQuest } from '@/app/guild/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

interface GuildUser {
    username: string;
    full_name: string;
    nickname?: string;
    avatar_url?: string;
}

export function CreateQuestForm({ users = [] }: { users?: GuildUser[] }) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const res = await createQuest({
            title,
            description,
            assigned_to: assignedTo || undefined
        });

        if (res.error) {
            toast.error(res.error);
            setIsLoading(false);
            return;
        }

        toast.success("Quest issued successfully!");
        setIsLoading(false);
        setOpen(false);
        setTitle('');
        setDescription('');
        setAssignedTo('');
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/20 h-7 sm:h-9 px-2 sm:px-3 text-[10px] sm:text-sm">
                    <PlusCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">New Quest</span>
                    <span className="sm:hidden">New</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <DialogHeader>
                    <DialogTitle>Issue New Guild Quest</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Box Title</label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Update Hero Section"
                            className="bg-zinc-800 border-zinc-700"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Description</label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Details about the task..."
                            className="bg-zinc-800 border-zinc-700 min-h-[100px]"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Assign To (Optional)</label>
                        <Select value={assignedTo} onValueChange={setAssignedTo}>
                            <SelectTrigger className="bg-zinc-800 border-zinc-700">
                                <SelectValue placeholder="Select a member..." />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800">
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {users.map(user => (
                                    <SelectItem key={user.username} value={user.username}>
                                        {user.nickname || (user.full_name || user.username).split(' ')[0]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" className="bg-violet-600 hover:bg-violet-500" disabled={isLoading}>
                            {isLoading ? 'Issuing...' : 'Issue Quest'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
