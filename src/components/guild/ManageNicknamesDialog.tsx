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
import { Users, Pencil, Save, X } from 'lucide-react';
import { updateUserNickname } from '@/app/guild/actions';
import { toast } from 'sonner';

interface GuildUser {
    username: string;
    full_name: string;
    nickname?: string;
    access_role?: string;
}

export function ManageNicknamesDialog({ users }: { users: GuildUser[] }) {
    const [open, setOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [tempNickname, setTempNickname] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = users.filter(u =>
        u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.nickname && u.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleEdit = (user: GuildUser) => {
        setEditingUser(user.username);
        setTempNickname(user.nickname || '');
    };

    const handleSave = async (username: string) => {
        setIsLoading(true);
        const res = await updateUserNickname(username, tempNickname);
        setIsLoading(false);

        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success("Nickname updated!");
            setEditingUser(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200">
                    <Users className="w-4 h-4 mr-2" />
                    Manage Members
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-900 text-zinc-100 max-w-2xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Manage Guild Members</DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    <Input
                        placeholder="Search members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-zinc-900 border-zinc-800"
                    />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                    {filteredUsers.map(user => (
                        <div key={user.username} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50 hover:bg-zinc-900/80 transition-colors">
                            <div className="flex flex-col">
                                <span className="font-medium text-zinc-200 text-sm">
                                    {user.full_name}
                                </span>
                                <span className="text-xs text-zinc-500 font-mono">
                                    @{user.username} • <span className="text-zinc-400">{user.access_role}</span>
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                {editingUser === user.username ? (
                                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <Input
                                            value={tempNickname}
                                            onChange={(e) => setTempNickname(e.target.value)}
                                            placeholder="Nickname"
                                            className="h-8 w-32 bg-zinc-950 border-zinc-700 text-xs"
                                            autoFocus
                                        />
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-950/20" onClick={() => handleSave(user.username)} disabled={isLoading}>
                                            <Save className="w-4 h-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-zinc-300" onClick={() => setEditingUser(null)}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 min-w-[120px] justify-end group">
                                        <span className={`text-sm ${user.nickname ? 'text-violet-400 font-medium' : 'text-zinc-600 italic'}`}>
                                            {user.nickname || 'No nickname'}
                                        </span>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300" onClick={() => handleEdit(user)}>
                                            <Pencil className="w-3 h-3" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
