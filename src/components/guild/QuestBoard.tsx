'use client';

import { useState, useEffect, useCallback } from 'react';
import { QuestCard } from './QuestCard';
import { CreateQuestForm } from './CreateQuestForm';
import { Button } from '@/components/ui/button';
import { clearCompletedQuests } from '@/app/guild/actions';
import { User, Layers, Trash2, Zap, Clock, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';

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
    const [quests, setQuests] = useState<Quest[]>(initialQuests);
    const [users, setUsers] = useState<GuildUser[]>(initialUsers);
    const [filter, setFilter] = useState<'all' | 'mine'>('all');
    const [activeTab, setActiveTab] = useState<'inprogress' | 'pending' | 'completed'>('inprogress');

    // Optimistic delete handler
    const handleOptimisticDelete = useCallback((id: string) => {
        setQuests(prev => prev.filter(q => q.id !== id));
    }, []);

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

    const tabs = [
        {
            key: 'inprogress' as const,
            label: 'Active',
            count: inProgress.length,
            icon: Zap,
            activeColors: 'from-blue-500/20 to-blue-600/5 text-blue-300 border-blue-500/40 shadow-blue-500/20',
            iconColor: 'text-blue-400'
        },
        {
            key: 'pending' as const,
            label: 'Pending',
            count: pending.length,
            icon: Clock,
            activeColors: 'from-amber-500/20 to-amber-600/5 text-amber-300 border-amber-500/40 shadow-amber-500/20',
            iconColor: 'text-amber-400'
        },
        {
            key: 'completed' as const,
            label: 'Done',
            count: completed.length,
            icon: CheckCheck,
            activeColors: 'from-emerald-500/20 to-emerald-600/5 text-emerald-300 border-emerald-500/40 shadow-emerald-500/20',
            iconColor: 'text-emerald-400'
        },
    ];

    return (
        <div className="h-full flex flex-col min-h-0">
            {/* Header / Filter Toolbar */}
            <div className="flex flex-col gap-2 mb-3 shrink-0">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex bg-zinc-900/80 rounded-lg p-1 border border-zinc-700/50 gap-1">
                        <button
                            onClick={() => setFilter('all')}
                            className={cn("px-3 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-all",
                                filter === 'all' ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                            )}
                        >
                            <Layers className="w-3.5 h-3.5" /> All
                        </button>
                        <button
                            onClick={() => setFilter('mine')}
                            className={cn("px-3 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-all",
                                filter === 'mine' ? "bg-violet-600/30 text-violet-300 border border-violet-500/30 shadow-sm" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                            )}
                        >
                            <User className="w-3.5 h-3.5" /> Mine
                        </button>
                    </div>
                    <CreateQuestForm users={users} />
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Redesigned Status Tabs */}
                <div className="shrink-0">
                    <div className="flex gap-2 p-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={cn(
                                        "flex-1 relative group px-3 py-2.5 rounded-xl font-medium transition-all duration-200",
                                        "flex items-center justify-center gap-2",
                                        isActive
                                            ? `bg-gradient-to-b ${tab.activeColors} border shadow-lg`
                                            : "bg-zinc-900/40 text-zinc-500 border border-zinc-800/50 hover:bg-zinc-800/50 hover:text-zinc-300 hover:border-zinc-700"
                                    )}
                                >
                                    <Icon className={cn(
                                        "w-4 h-4 transition-colors",
                                        isActive ? tab.iconColor : "text-zinc-600 group-hover:text-zinc-400"
                                    )} />
                                    <span className="text-xs sm:text-sm">{tab.label}</span>
                                    <span className={cn(
                                        "ml-1 text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-mono",
                                        isActive
                                            ? "bg-white/10"
                                            : "bg-zinc-800 text-zinc-500"
                                    )}>
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 mt-3 custom-scrollbar">
                    {activeTab === 'inprogress' && (
                        <div className="space-y-2 sm:space-y-3">
                            {inProgress.length === 0 && (
                                <div className="py-8 sm:py-12 text-center text-zinc-600 text-xs border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
                                    <Zap className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                                    <p className="font-medium">No active quests</p>
                                    <p className="text-zinc-700 mt-1">Check pending quests to start one!</p>
                                </div>
                            )}
                            {inProgress.map(q => (
                                <QuestCard
                                    key={q.id}
                                    quest={q}
                                    currentUser={currentUser}
                                    userRole={userRole}
                                    users={users}
                                    onDelete={handleOptimisticDelete}
                                />
                            ))}
                        </div>
                    )}

                    {activeTab === 'pending' && (
                        <div className="space-y-2 sm:space-y-3">
                            {pending.length === 0 && (
                                <div className="py-8 sm:py-12 text-center text-zinc-600 text-xs border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
                                    <Clock className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                                    <p className="font-medium">No pending quests</p>
                                    <p className="text-zinc-700 mt-1">Create a new quest to get started!</p>
                                </div>
                            )}
                            {pending.map(q => (
                                <QuestCard
                                    key={q.id}
                                    quest={q}
                                    currentUser={currentUser}
                                    userRole={userRole}
                                    users={users}
                                    onDelete={handleOptimisticDelete}
                                />
                            ))}
                        </div>
                    )}

                    {activeTab === 'completed' && (
                        <div className="space-y-3">
                            {userRole === 'super_admin' && completed.length > 0 && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={async () => {
                                        if (confirm("Clear ALL completed quests history? This cannot be undone.")) {
                                            await clearCompletedQuests();
                                        }
                                    }}
                                    className="w-full text-xs h-9 bg-red-950/30 text-red-400 hover:bg-red-900/40 border border-red-900/40 rounded-xl"
                                >
                                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Clear History (Admin)
                                </Button>
                            )}
                            {completed.length === 0 && (
                                <div className="py-8 sm:py-12 text-center text-zinc-600 text-xs border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
                                    <CheckCheck className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                                    <p className="font-medium">No completed quests</p>
                                    <p className="text-zinc-700 mt-1">Finish some quests to see them here!</p>
                                </div>
                            )}
                            <div className="opacity-70 space-y-2 sm:space-y-3">
                                {completed.map(q => (
                                    <QuestCard
                                        key={q.id}
                                        quest={q}
                                        currentUser={currentUser}
                                        userRole={userRole}
                                        users={users}
                                        onDelete={handleOptimisticDelete}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
