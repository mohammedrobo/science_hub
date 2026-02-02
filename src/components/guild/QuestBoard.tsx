'use client';

import { useState, useEffect } from 'react';
import { QuestCard } from './QuestCard';
import { CreateQuestForm } from './CreateQuestForm';
import { Button } from '@/components/ui/button';
import { clearCompletedQuests } from '@/app/guild/actions';
import { User, Layers, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';

// Re-defining interface or importing if I had a types file.
// For speed:
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
    avatar_url?: string;
}

export function QuestBoard({ initialQuests, currentUser, userRole, users: initialUsers = [] }: { initialQuests: Quest[], currentUser: string, userRole?: string, users?: GuildUser[] }) {
    // Initialize state with props
    const [quests, setQuests] = useState<Quest[]>(initialQuests);
    const [users, setUsers] = useState<GuildUser[]>(initialUsers);
    const [filter, setFilter] = useState<'all' | 'mine'>('all');

    // Realtime subscription
    useEffect(() => {
        const questChannel = supabase
            .channel('guild_quests_board')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'guild_quests' },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setQuests((prev) => [payload.new as Quest, ...prev]);
                    } else if (payload.eventType === 'DELETE') {
                        setQuests((prev) => prev.filter((q) => q.id !== payload.old.id));
                    } else if (payload.eventType === 'UPDATE') {
                        setQuests((prev) => prev.map((q) => (q.id === payload.new.id ? (payload.new as Quest) : q)));
                    }
                }
            )
            .subscribe((status, err) => {
                if (err) console.warn('Quest board subscription error:', err);
            });

        const userChannel = supabase
            .channel('guild_users_board')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'allowed_users' },
                (payload) => {
                    const updatedUser = payload.new as GuildUser;
                    setUsers(prev => prev.map(u => u.username === updatedUser.username ? { ...u, ...updatedUser } : u));
                }
            )
            .subscribe((status, err) => {
                if (err) console.warn('Quest users subscription error:', err);
            });

        return () => {
            supabase.removeChannel(questChannel);
            supabase.removeChannel(userChannel);
        };
    }, []);

    const filteredQuests = quests.filter(q => {
        if (filter === 'mine') {
            return q.assigned_to === currentUser;
        }
        return true;
    });

    const pending = filteredQuests.filter(q => q.status === 'pending');
    const inProgress = filteredQuests.filter(q => q.status === 'in_progress');
    const completed = filteredQuests.filter(q => q.status === 'completed');

    return (
        <div className="h-full flex flex-col">
            {/* Header / Filter Toolbar */}
            <div className="flex flex-col gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0">
                    <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                        <button
                            onClick={() => setFilter('all')}
                            className={cn("flex-1 sm:flex-initial px-3 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-2 transition-all",
                                filter === 'all' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <Layers className="w-3 h-3" /> All
                        </button>
                        <button
                            onClick={() => setFilter('mine')}
                            className={cn("flex-1 sm:flex-initial px-3 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-2 transition-all",
                                filter === 'mine' ? "bg-violet-900/30 text-violet-300 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <User className="w-3 h-3" /> Mine
                        </button>
                    </div>
                    <CreateQuestForm users={users} />
                </div>
            </div>

            <Tabs defaultValue="inprogress" className="flex-1 flex flex-col min-h-0">
                <div className="px-1">
                    <TabsList className="grid w-full grid-cols-3 bg-zinc-900 border border-zinc-800 h-9">
                        <TabsTrigger value="inprogress" className="text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-blue-400">
                            In Progress ({inProgress.length})
                        </TabsTrigger>
                        <TabsTrigger value="pending" className="text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-200">
                            Pending ({pending.length})
                        </TabsTrigger>
                        <TabsTrigger value="completed" className="text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-emerald-500">
                            Done ({completed.length})
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 mt-3 custom-scrollbar min-h-0">
                    <TabsContent value="inprogress" className="space-y-3 m-0">
                        {inProgress.length === 0 && (
                            <div className="p-8 text-center text-zinc-600 text-xs italic border border-dashed border-zinc-900 rounded-lg">
                                No active quests. Check pending!
                            </div>
                        )}
                        {inProgress.map(q => <QuestCard key={q.id} quest={q} currentUser={currentUser} userRole={userRole} users={users} />)}
                    </TabsContent>

                    <TabsContent value="pending" className="space-y-3 m-0">
                        {pending.length === 0 && (
                            <div className="p-8 text-center text-zinc-600 text-xs italic border border-dashed border-zinc-900 rounded-lg">
                                No pending quests.
                            </div>
                        )}
                        {pending.map(q => <QuestCard key={q.id} quest={q} currentUser={currentUser} userRole={userRole} users={users} />)}
                    </TabsContent>

                    <TabsContent value="completed" className="space-y-3 m-0">
                        <div className="flex justify-between items-center mb-2">
                            {userRole === 'admin' && completed.length > 0 && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={async () => {
                                        if (confirm("Clear ALL completed quests history? This cannot be undone.")) {
                                            await clearCompletedQuests();
                                        }
                                    }}
                                    className="w-full text-xs h-8 bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-900/50"
                                >
                                    <Trash2 className="w-3 h-3 mr-2" /> Clear History (Admin)
                                </Button>
                            )}
                        </div>
                        {completed.length === 0 && (
                            <div className="p-8 text-center text-zinc-600 text-xs italic border border-dashed border-zinc-900 rounded-lg">
                                No history yet.
                            </div>
                        )}
                        <div className="opacity-70">
                            {completed.map(q => <QuestCard key={q.id} quest={q} currentUser={currentUser} userRole={userRole} users={users} />)}
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
