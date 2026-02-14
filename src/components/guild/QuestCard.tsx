'use client';

import { useState } from 'react';
import { updateQuestStatus, deleteQuest } from '@/app/guild/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sword, CheckCircle2, CircleDashed, Trash2, Clock, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Quest {
    id: string;
    title: string;
    description: string | null;
    status: 'pending' | 'in_progress' | 'completed';
    assigned_to: string | null;
    created_at: string;
    created_by: string;
}

interface GuildUser {
    username: string;
    full_name: string;
    nickname?: string;
    avatar_url?: string;
}

interface QuestCardProps {
    quest: Quest;
    currentUser: string;
    userRole?: string;
    users?: GuildUser[];
    onDelete?: (id: string) => void;
}

export function QuestCard({ quest, currentUser, userRole, users = [], onDelete }: QuestCardProps) {
    const [isLoading, setIsLoading] = useState(false);

    const isAssignedToMe = quest.assigned_to === currentUser;
    const canInteract = !quest.assigned_to || isAssignedToMe;

    const creator = users.find(u => u.username === quest.created_by);
    const assignee = users.find(u => u.username === quest.assigned_to);

    const creatorName = creator?.nickname || creator?.full_name || quest.created_by;
    const assigneeName = assignee?.nickname || assignee?.full_name || quest.assigned_to;

    const isAdmin = userRole === 'super_admin';
    const isCreator = quest.created_by === currentUser;
    const isPending = quest.status === 'pending';

    // Logic: Admin can delete ANY. Creator can delete PENDING.
    const canDelete = isAdmin || (isPending && isCreator);

    const handleStatusUpdate = async (newStatus: 'pending' | 'in_progress' | 'completed') => {
        setIsLoading(true);
        await updateQuestStatus(quest.id, newStatus);
        setIsLoading(false);
    };

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this quest?')) {
            setIsLoading(true);
            // Optimistically remove from UI via callback
            if (onDelete) {
                onDelete(quest.id);
            }
            const res = await deleteQuest(quest.id);
            setIsLoading(false);
            if (res?.error) {
                // If error, the realtime subscription will restore it
                console.error('Delete failed:', res.error);
            }
        }
    };

    const statusConfig = {
        pending: { color: 'text-zinc-400', bg: 'bg-zinc-800/50', border: 'border-zinc-700' },
        in_progress: { color: 'text-blue-400', bg: 'bg-blue-950/20', border: 'border-blue-900/50' },
        completed: { color: 'text-emerald-400', bg: 'bg-emerald-950/20', border: 'border-emerald-900/50' },
    };

    const style = statusConfig[quest.status];



    return (
        <Card className={cn("transition-all duration-300 border-l-4 relative group", style.bg, style.border,
            quest.status === 'completed' ? 'border-l-emerald-500' :
                quest.status === 'in_progress' ? 'border-l-blue-500' : 'border-l-zinc-600',
            !canInteract && "opacity-80 grayscale-[0.3]"
        )}>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-base sm:text-lg text-zinc-100 flex items-center gap-2">
                        {quest.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                        {quest.status === 'in_progress' && <Sword className="w-5 h-5 text-blue-500 animate-pulse" />}
                        {quest.status === 'pending' && <CircleDashed className="w-5 h-5 text-zinc-500" />}
                        <span className={quest.status === 'completed' ? 'line-through text-zinc-500' : ''}>
                            {quest.title}
                        </span>
                    </CardTitle>
                    <div className="flex gap-1">
                        {canDelete && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleDelete}>
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-zinc-400 mb-4 font-light">
                    {quest.description || 'No details provided.'}
                </p>

                {/* Footer Info */}
                <div className="flex flex-col gap-2 mt-2">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                        <span>Created by <span className="text-zinc-300">{creatorName}</span></span>
                        <span>{new Date(quest.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
                        <div className="flex items-center gap-2">
                            {quest.assigned_to ? (
                                <Badge variant="outline" className={cn("text-xs border-zinc-700",
                                    isAssignedToMe ? "text-violet-400 border-violet-900 bg-violet-900/10" : "text-zinc-400"
                                )}>
                                    {isAssignedToMe ? 'Assigned to You' : assigneeName}
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-500 border-dashed">
                                    Unassigned
                                </Badge>
                            )}
                        </div>

                        {canInteract && (
                            <div className="flex gap-1">
                                {quest.status === 'pending' && (
                                    <Button size="sm" variant="outline"
                                        className="h-7 text-xs border-blue-900 text-blue-400 hover:bg-blue-900/20"
                                        onClick={() => handleStatusUpdate('in_progress')}
                                        disabled={isLoading}
                                    >
                                        <PlayCircle className="w-3 h-3 mr-1" /> Start
                                    </Button>
                                )}
                                {quest.status === 'in_progress' && (
                                    <Button size="sm" variant="outline"
                                        className="h-7 text-xs border-emerald-900 text-emerald-400 hover:bg-emerald-900/20"
                                        onClick={() => handleStatusUpdate('completed')}
                                        disabled={isLoading}
                                    >
                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                                    </Button>
                                )}
                                {quest.status === 'completed' && (
                                    <Button size="sm" variant="ghost"
                                        className="h-7 text-xs text-zinc-500 hover:text-zinc-300"
                                        onClick={() => handleStatusUpdate('pending')}
                                        disabled={isLoading}
                                    >
                                        <RotateCcw className="w-3 h-3 mr-1" /> Reopen
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function RotateCcw(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" />
            <path d="M3 3v9h9" />
        </svg>
    )
}
