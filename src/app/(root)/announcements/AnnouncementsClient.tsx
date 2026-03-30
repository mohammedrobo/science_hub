'use client';

import { useState, useEffect, useCallback } from 'react';
import { Megaphone, Send, Loader2, Trash2, Edit2, Save, X, Filter, ChevronDown, ChevronUp, BookOpen, Pin, BarChart3, AlertTriangle, Bell, Plus, Minus, Vote, Clock, Eye } from 'lucide-react';
import { getNotifications, createAppNotification, deleteNotification, updateNotification, votePoll, removePollVote, togglePinNotification, markNotificationAsRead, getPollVoterDetails, getNotificationReads } from '@/app/actions/notifications';
import { supabase } from '@/lib/supabase/client';
import type { Notification, PollData } from '@/types/notifications';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslations } from 'next-intl';

interface CourseInfo {
    id: string;
    name: string;
    code: string;
}

interface AnnouncementsPageProps {
    userRole: 'super_admin' | 'admin' | 'leader' | 'student' | 'doctor';
    userSection?: string | null;
    userGroup?: string | null;
    userName?: string;
    courses?: CourseInfo[];
}

// Short display name for course badges
function shortCourseName(name: string): string {
    return name
        .replace('General ', '')
        .replace('Practical ', 'Pr. ')
        .replace('Introduction to ', '')
        .replace(' (ثقافة بيئية)', '')
        .replace('Environmental Culture', 'Env. Culture');
}

// Notification type config
const TYPE_CONFIG: Record<string, { labelKey: string; icon: string; accent: string; bg: string; border: string }> = {
    announcement: { labelKey: 'typeAnnouncement', icon: '📢', accent: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
    urgent: { labelKey: 'typeUrgent', icon: '🚨', accent: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    reminder: { labelKey: 'typeReminder', icon: '🔔', accent: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    poll: { labelKey: 'typePoll', icon: '📊', accent: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
};

// ─── Poll Widget ──────────────────────────────────────────────────────────────
function PollWidget({ poll, onVote, onRemoveVote, t, canViewVoters }: {
    poll: PollData;
    onVote: (pollId: string, optionIndex: number) => Promise<void>;
    onRemoveVote: (pollId: string, optionIndex: number) => Promise<void>;
    t: (key: string) => string;
    canViewVoters?: boolean;
}) {
    const [voting, setVoting] = useState<number | null>(null);
    const [showVoters, setShowVoters] = useState(false);
    const [voterDetails, setVoterDetails] = useState<Record<number, { username: string; fullName: string }[]> | null>(null);
    const [loadingVoters, setLoadingVoters] = useState(false);
    const hasVoted = poll.user_vote && poll.user_vote.length > 0;
    const isEnded = poll.ends_at && new Date(poll.ends_at) < new Date();
    const showResults = hasVoted || isEnded;

    const handleVote = async (optionIndex: number) => {
        setVoting(optionIndex);
        const isSelected = poll.user_vote?.includes(optionIndex);
        if (isSelected) {
            await onRemoveVote(poll.id, optionIndex);
        } else {
            await onVote(poll.id, optionIndex);
        }
        setVoting(null);
    };

    // Calculate total votes for percentage
    const totalVoteCount = poll.votes.reduce((sum, v) => sum + v.count, 0);

    return (
        <div className="mt-4 space-y-2.5 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
            {/* Poll header */}
            <div className="flex items-center justify-between gap-2 mb-3">
                <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-violet-400" />
                    {poll.question}
                </h4>
                <div className="flex items-center gap-2 shrink-0">
                    {poll.allow_multiple && (
                        <span className="text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/30 px-1.5 py-0.5 rounded">
                            {t('multiSelect')}
                        </span>
                    )}
                    {isEnded ? (
                        <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> {t('ended')}
                        </span>
                    ) : poll.ends_at ? (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> {formatDistanceToNow(new Date(poll.ends_at), { addSuffix: false })} {t('left')}
                        </span>
                    ) : null}
                </div>
            </div>

            {/* Options */}
            <div className="space-y-2">
                {poll.options.map((option, idx) => {
                    const voteEntry = poll.votes.find(v => v.option === idx);
                    const count = voteEntry?.count || 0;
                    const percentage = totalVoteCount > 0 ? Math.round((count / totalVoteCount) * 100) : 0;
                    const isSelected = poll.user_vote?.includes(idx);
                    const isVotingThis = voting === idx;

                    return (
                        <button
                            key={idx}
                            onClick={() => !isEnded && handleVote(idx)}
                            disabled={!!isEnded || voting !== null}
                            className={`w-full relative overflow-hidden rounded-lg border transition-all duration-300 text-left group ${
                                isSelected
                                    ? 'border-violet-500/50 bg-violet-500/10'
                                    : 'border-zinc-700/50 bg-zinc-800/30 hover:border-zinc-600/50'
                            } ${isEnded ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                            {/* Progress bar background */}
                            {showResults && (
                                <div
                                    className={`absolute inset-0 transition-all duration-700 ease-out ${
                                        isSelected ? 'bg-violet-500/15' : 'bg-zinc-700/15'
                                    }`}
                                    style={{ width: `${percentage}%` }}
                                />
                            )}
                            <div className="relative flex items-center justify-between px-3.5 py-2.5">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    {/* Radio/checkbox indicator */}
                                    <div className={`w-4 h-4 rounded-${poll.allow_multiple ? 'sm' : 'full'} border-2 flex items-center justify-center shrink-0 transition-all ${
                                        isSelected
                                            ? 'border-violet-400 bg-violet-500'
                                            : 'border-zinc-600 group-hover:border-zinc-500'
                                    }`}>
                                        {isSelected && (
                                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className={`text-sm truncate ${isSelected ? 'text-violet-200 font-medium' : 'text-zinc-300'}`}>
                                        {option}
                                    </span>
                                    {isVotingThis && <Loader2 className="w-3 h-3 animate-spin text-violet-400 shrink-0" />}
                                </div>
                                {showResults && (
                                    <span className={`text-xs font-mono shrink-0 ml-2 ${isSelected ? 'text-violet-300' : 'text-zinc-500'}`}>
                                        {percentage}%
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-zinc-500">
                    {poll.total_votes} {poll.total_votes === 1 ? t('vote') : t('votes')}
                </span>
                <div className="flex items-center gap-3">
                    {hasVoted && !isEnded && (
                        <span className="text-[10px] text-violet-400/70">
                            {t('youVoted')}
                        </span>
                    )}
                    {canViewVoters && poll.total_votes > 0 && (
                        <button
                            type="button"
                            onClick={async (e) => {
                                e.stopPropagation();
                                if (showVoters) {
                                    setShowVoters(false);
                                    return;
                                }
                                if (!voterDetails) {
                                    setLoadingVoters(true);
                                    const res = await getPollVoterDetails(poll.id);
                                    if (res.success && res.votersByOption) {
                                        setVoterDetails(res.votersByOption);
                                    }
                                    setLoadingVoters(false);
                                }
                                setShowVoters(true);
                            }}
                            className="text-[10px] font-medium text-emerald-400/80 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 hover:border-emerald-500/40 px-2 py-0.5 rounded-md transition-all flex items-center gap-1"
                        >
                            {loadingVoters ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                                <>{showVoters ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}</>  
                            )}
                            {showVoters ? t('hideVoters') : t('viewVoters')}
                        </button>
                    )}
                </div>
            </div>

            {/* Voter Details Panel (Admin Only) */}
            {showVoters && voterDetails && (
                <div className="mt-3 space-y-2 border-t border-zinc-800/60 pt-3">
                    {poll.options.map((option, idx) => {
                        const voters = voterDetails[idx] || [];
                        return (
                            <div key={idx} className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-semibold text-zinc-400">{option}</span>
                                    <span className="text-[10px] text-zinc-600">({voters.length})</span>
                                </div>
                                {voters.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 ps-3">
                                        {voters.map((v) => (
                                            <span
                                                key={v.username}
                                                className="text-[10px] bg-zinc-800/80 text-zinc-300 border border-zinc-700/40 px-2 py-0.5 rounded-md"
                                                title={v.username}
                                            >
                                                {v.fullName}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-[10px] text-zinc-600 ps-3">—</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AnnouncementsClient({ userRole, userSection, userGroup, userName, courses = [] }: AnnouncementsPageProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState<string>('all'); // 'all' | 'general' | course code
    const [filterSection, setFilterSection] = useState<string>('all'); // 'all' | section like 'A1'
    const [filterType, setFilterType] = useState<string>('all'); // 'all' | type
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    
    // Read receipts state
    const [showReadsFor, setShowReadsFor] = useState<string | null>(null);
    const [readsDetails, setReadsDetails] = useState<Record<string, { username: string; fullName: string, section: string | null }[]>>({});
    const [loadingReads, setLoadingReads] = useState<string | null>(null);

    // Compose state
    const canPost = userRole === 'super_admin' || userRole === 'admin' || userRole === 'leader' || userRole === 'doctor';
    const isAdmin = userRole === 'super_admin' || userRole === 'admin' || userRole === 'doctor';
    const [showCompose, setShowCompose] = useState(false);
    const [composeTitle, setComposeTitle] = useState('');
    const [composeMessage, setComposeMessage] = useState('');
    const [composeTarget, setComposeTarget] = useState<string>('all');
    const [composeCategory, setComposeCategory] = useState<string>('general');
    const [composeType, setComposeType] = useState<string>('announcement');
    const [sending, setSending] = useState(false);

    // Poll compose state
    const [showPollForm, setShowPollForm] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
    const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
    const [pollEndsAt, setPollEndsAt] = useState('');

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ title: '', message: '' });
    const [actionLoading, setActionLoading] = useState(false);

    const t = useTranslations('announcements');
    const tn = useTranslations('notifications');

    const loadAnnouncements = useCallback(async () => {
        setLoading(true);
        const data = await getNotifications();
        setNotifications(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadAnnouncements();
    }, [loadAnnouncements]);

    const toggleExpand = async (id: string) => {
        const isExpanding = !expandedIds.has(id);
        
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (isExpanding) next.add(id);
            else next.delete(id);
            return next;
        });

        if (isExpanding) {
            const notification = notifications.find(n => n.id === id);
            if (notification && !notification.is_read) {
                // Optimistically mark as read locally
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
                // Direct Supabase insert instead of server action bypasses Vercel edge functions
                if (userName) {
                    // @ts-ignore - notification_reads might not be in the generated types yet
                    supabase.from('notification_reads').insert({ notification_id: id, username: userName }).then(({ error }) => {
                        // Ignore unique constraint violations (already read)
                        if (error && error.code !== '23505') {
                            console.error("Failed to mark directly as read", error);
                        }
                    });
                }
            }
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate poll data if poll form is open or type is poll
        let pollData = null;
        if (showPollForm || composeType === 'poll') {
            const filledOptions = pollOptions.filter(o => o.trim());
            if (!pollQuestion.trim() || filledOptions.length < 2) {
                toast.error(t('pollNeedsOptions'));
                return;
            }
            pollData = {
                question: pollQuestion.trim(),
                options: filledOptions.map(o => o.trim()),
                allow_multiple: pollAllowMultiple,
                ends_at: pollEndsAt ? new Date(pollEndsAt).toISOString() : null,
            };
        }

        // Validate generic text input unless it's a standalone poll
        if (composeType !== 'poll' && (!composeTitle.trim() || !composeMessage.trim())) {
            toast.error(t('titleMessageRequired', { defaultMessage: 'Title and message are required.' }));
            return;
        }

        setSending(true);
        const targetSection = isAdmin
            ? (composeTarget === 'all' ? null : composeTarget)
            : userSection; // leaders send to their own section only

        const category = composeCategory === 'general' ? null : composeCategory;
        
        // If it's a standalone poll, map the question to the title and use a placeholder message
        const finalTitle = composeType === 'poll' ? pollQuestion.trim() : composeTitle;
        const finalMessage = composeType === 'poll' ? '📊' : composeMessage;

        let result;
        try {
            result = await createAppNotification(
                finalTitle, finalMessage, targetSection || null, category,
                composeType, pollData
            );
        } catch (err) {
            console.error('handleSend error:', err);
            toast.error(t('sendFailed', { defaultMessage: 'Failed to send. Check console.' }));
            setSending(false);
            return;
        }

        if (result.success) {
            toast.success(t('sent'));
            setComposeTitle('');
            setComposeMessage('');
            setComposeTarget('all');
            setComposeCategory('general');
            setComposeType('announcement');
            setShowCompose(false);
            setShowPollForm(false);
            setPollQuestion('');
            setPollOptions(['', '']);
            setPollAllowMultiple(false);
            setPollEndsAt('');
            await loadAnnouncements();
        } else {
            toast.error(result.error || t('sendFailed'));
        }
        setSending(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('deleteConfirm'))) return;
        setActionLoading(true);
        const result = await deleteNotification(id);
        if (result.success) {
            toast.success(t('deleted'));
            setNotifications(prev => prev.filter(n => n.id !== id));
        } else {
            toast.error(result.error);
        }
        setActionLoading(false);
    };

    const startEdit = (n: Notification) => {
        setEditingId(n.id);
        setEditForm({ title: n.title, message: n.message });
    };

    const handleUpdate = async () => {
        if (!editingId) return;
        setActionLoading(true);
        const result = await updateNotification(editingId, editForm.title, editForm.message);
        if (result.success) {
            toast.success(t('updated'));
            setNotifications(prev => prev.map(n => n.id === editingId ? { ...n, ...editForm } : n));
            setEditingId(null);
        } else {
            toast.error(result.error);
        }
        setActionLoading(false);
    };

    const handleVote = async (pollId: string, optionIndex: number) => {
        // Mark the parent notification as read when voting
        const parentNotification = notifications.find(n => n.poll?.id === pollId);
        if (parentNotification && !parentNotification.is_read) {
            setNotifications(prev => prev.map(x => x.id === parentNotification.id ? { ...x, is_read: true } : x));
            if (userName) {
                // @ts-ignore - notification_reads might not be in the generated types yet
                supabase.from('notification_reads').insert({ notification_id: parentNotification.id, username: userName }).then(() => {}).catch(() => {});
            }
        }
        const result = await votePoll(pollId, optionIndex);
        if (result.success) {
            await loadAnnouncements();
        } else {
            toast.error(result.error);
        }
    };

    const handleRemoveVote = async (pollId: string, optionIndex: number) => {
        const result = await removePollVote(pollId, optionIndex);
        if (result.success) {
            await loadAnnouncements();
        } else {
            toast.error(result.error);
        }
    };

    const handleTogglePin = async (id: string) => {
        const result = await togglePinNotification(id);
        if (result.success) {
            toast.success(result.pinned ? t('pinned') : t('unpinned'));
            await loadAnnouncements();
        } else {
            toast.error(result.error);
        }
    };

    // Build list of used categories from existing notifications
    const usedCategories = new Set(notifications.map(n => n.category).filter(Boolean));

    // ─── Visibility logic ───
    const visibleNotifications = (() => {
        let filtered = notifications;

        // Type filter
        if (filterType !== 'all') {
            filtered = filtered.filter(n => n.type === filterType);
        }

        if (isAdmin) {
            // Category filter
            if (filterCategory === 'general') {
                filtered = filtered.filter(n => !n.category);
            } else if (filterCategory !== 'all') {
                filtered = filtered.filter(n => n.category === filterCategory);
            }
            // Section filter
            if (filterSection !== 'all') {
                filtered = filtered.filter(n => n.target_section === filterSection || !n.target_section);
            }
        } else {
            // Students & leaders: only see their own group/section or global
            filtered = filtered.filter(n => {
                if (!n.target_section) return true;
                if (userSection && n.target_section === userSection) return true;
                if (userGroup && n.target_section === `group_${userGroup}`) return true;
                return false;
            });
        }

        return filtered;
    })();

    // Get course name from code
    const getCourseName = (code: string) => {
        const course = courses.find(c => c.code === code);
        return course ? shortCourseName(course.name) : code;
    };

    // Course badge color by subject area
    const getCourseColor = (code: string) => {
        if (code.startsWith('M')) return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
        if (code.startsWith('P')) return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
        if (code.startsWith('C')) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
        if (code.startsWith('Z') || code.startsWith('B')) return 'text-green-400 bg-green-500/10 border-green-500/30';
        if (code.startsWith('G')) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
        if (code.startsWith('U') || code.startsWith('SO')) return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
        if (code.startsWith('COMP')) return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
        return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30';
    };

    // Get border accent for notification type
    const getCardBorder = (n: Notification) => {
        if (n.is_pinned) return 'border-amber-500/30 ring-1 ring-amber-500/10';
        if (n.type === 'urgent') return 'border-red-500/30';
        if (n.type === 'poll') return 'border-violet-500/20';
        return '';
    };

    return (
        <div className="flex-1 w-full relative">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[min(800px,200vw)] h-[400px] bg-blue-900/15 blur-[120px] rounded-full pointer-events-none -z-10" />

            {/* Header */}
            <div className="bg-card/80 border-b border-border mb-6 sm:mb-8">
                <div className="container mx-auto px-4 py-8 sm:py-10">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-4xl font-bold text-zinc-100 mb-2 tracking-tight flex items-center gap-3">
                                <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-2.5 rounded-xl text-white shadow-lg">
                                    <Megaphone className="h-6 w-6" />
                                </div>
                                {t('title')}
                            </h1>
                            <p className="text-sm sm:text-base text-zinc-400">{t('subtitle')}</p>
                        </div>

                        {canPost && (
                            <Button
                                onClick={() => setShowCompose(!showCompose)}
                                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/20 rounded-xl px-5"
                            >
                                <Send className="w-4 h-4 me-2" />
                                {t('newAnnouncement')}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 pb-20">
                {/* Compose Form */}
                {canPost && showCompose && (
                    <form onSubmit={handleSend} className="glass-card rounded-2xl p-5 sm:p-6 mb-6 border border-blue-500/20 space-y-4">
                        <h3 className="font-semibold text-lg text-zinc-100 flex items-center gap-2">
                            <Send className="w-4 h-4 text-blue-400" />
                            {t('compose')}
                        </h3>

                        {/* Type Selector (Admin/Doctor) */}
                        {isAdmin && (
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-400">{t('type')}</label>
                                <div className="flex gap-2 flex-wrap">
                                    {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setComposeType(key)}
                                            className={`px-3 py-1.5 text-xs rounded-lg border transition-all font-medium ${
                                                composeType === key
                                                    ? `${config.accent} ${config.bg} ${config.border}`
                                                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                                            }`}
                                        >
                                            {t(config.labelKey)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Category Selector (Admin/Doctor) */}
                        {isAdmin && composeType !== 'poll' && courses.length > 0 && (
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-400">{t('category')}</label>
                                <Select value={composeCategory} onValueChange={setComposeCategory}>
                                    <SelectTrigger className="w-full bg-zinc-900/80 border-zinc-700/50 rounded-xl text-zinc-100 h-11">
                                        <SelectValue placeholder="Select category..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-700">
                                        <SelectItem value="general">{t('generalAnnouncement')}</SelectItem>
                                        <SelectGroup>
                                            <SelectLabel className="text-zinc-500">{t('courseSpecific')}</SelectLabel>
                                            {courses.map(c => (
                                                <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Target (Admin/Super Admin only) */}
                        {isAdmin && (
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-400">{t('targetAudience')}</label>
                                <Select value={composeTarget} onValueChange={setComposeTarget}>
                                    <SelectTrigger className="w-full bg-zinc-900/80 border-zinc-700/50 rounded-xl text-zinc-100 h-11">
                                        <SelectValue placeholder="Select target..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-700 max-h-[300px]">
                                        <SelectItem value="all">{t('everyone')}</SelectItem>
                                        <SelectGroup>
                                            <SelectLabel className="text-zinc-500">{t('groups')}</SelectLabel>
                                            <SelectItem value="group_A">{t('groupLabel', { letter: 'A' })}</SelectItem>
                                            <SelectItem value="group_B">{t('groupLabel', { letter: 'B' })}</SelectItem>
                                            <SelectItem value="group_C">{t('groupLabel', { letter: 'C' })}</SelectItem>
                                            <SelectItem value="group_D">{t('groupLabel', { letter: 'D' })}</SelectItem>
                                        </SelectGroup>
                                        {['A', 'B', 'C', 'D'].map(g => (
                                            <SelectGroup key={g}>
                                                <SelectLabel className="text-zinc-500">{t('groupSections', { letter: g })}</SelectLabel>
                                                {[1, 2, 3, 4].map(n => (
                                                    <SelectItem key={`${g}${n}`} value={`${g}${n}`}>{t('sectionLabel', { code: `${g}${n}` })}</SelectItem>
                                                ))}
                                            </SelectGroup>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {userRole === 'leader' && (
                            <div className="text-sm text-zinc-400 bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-800">
                                {t('sendingTo')}: <span className="text-blue-400 font-bold">{userSection}</span>
                            </div>
                        )}

                        {/* Title & Message inputs (Hidden for Standalone Polls) */}
                        {composeType !== 'poll' && (
                            <>
                                <input
                                    type="text"
                                    placeholder={t('titlePlaceholder')}
                                    value={composeTitle}
                                    onChange={(e) => setComposeTitle(e.target.value)}
                                    className="w-full bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder-zinc-500"
                                />

                                <div className="space-y-1">
                                    <textarea
                                        placeholder={t('messagePlaceholder')}
                                        value={composeMessage}
                                        onChange={(e) => setComposeMessage(e.target.value)}
                                        rows={6}
                                        className="w-full bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder-zinc-500 resize-y min-h-[120px]"
                                    />
                                    <div className="flex justify-end">
                                        <span className={`text-[10px] ${composeMessage.length > 500 ? 'text-amber-400' : 'text-zinc-600'}`}>
                                            {composeMessage.length} {t('characters')}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Poll Toggle (Only for non-poll types) */}
                        {isAdmin && composeType !== 'poll' && (
                            <div className="space-y-3">
                                <button
                                    type="button"
                                    onClick={() => setShowPollForm(!showPollForm)}
                                    className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border transition-all ${
                                        showPollForm
                                            ? 'text-violet-300 bg-violet-500/10 border-violet-500/30'
                                            : 'text-zinc-400 bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                                    }`}
                                >
                                    <BarChart3 className="w-3.5 h-3.5" />
                                    {showPollForm ? t('removePoll') : t('addPoll')}
                                </button>
                            </div>
                        )}

                        {/* Poll Form (Visible if form is active OR if standalone poll type is selected) */}
                        {isAdmin && (showPollForm || composeType === 'poll') && (
                            <div className="p-5 sm:p-6 bg-gradient-to-br from-violet-950/40 to-indigo-950/20 shadow-lg shadow-violet-900/10 border border-violet-800/50 rounded-2xl relative overflow-hidden">
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 blur-[40px] pointer-events-none rounded-full -translate-y-1/2 translate-x-1/2" />
                                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-violet-500/50 to-indigo-500/20" />
                                
                                <div className="relative z-10 space-y-5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-violet-500/20 p-2 rounded-lg border border-violet-500/20">
                                            <Vote className="w-4 h-4 text-violet-400" />
                                        </div>
                                        <h4 className="text-sm font-semibold text-violet-200">{composeType === 'poll' ? t('createStandalonePoll', { defaultMessage: 'Create a Poll' }) : t('pollDetails', { defaultMessage: 'Poll Details' })}</h4>
                                    </div>

                                    <textarea
                                        placeholder={t('pollQuestion')}
                                        value={pollQuestion}
                                        onChange={(e) => setPollQuestion(e.target.value)}
                                        rows={2}
                                        className="w-full bg-zinc-950/60 border border-violet-900/50 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-violet-500 outline-none placeholder-zinc-500 font-medium resize-none shadow-inner"
                                    />

                                    {/* Poll Category */}
                                    {composeType === 'poll' && courses.length > 0 && (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-violet-300/70 uppercase tracking-wider">{t('pollCategory')}</label>
                                            <Select value={composeCategory} onValueChange={setComposeCategory}>
                                                <SelectTrigger className="w-full bg-zinc-950/60 border-violet-900/50 rounded-xl text-zinc-200 h-11 focus:ring-violet-500">
                                                    <SelectValue placeholder="Select category..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-950 border-violet-900/50">
                                                    <SelectItem value="general" className="focus:bg-violet-500/10 focus:text-violet-200">{t('generalPoll')}</SelectItem>
                                                    <SelectGroup>
                                                        <SelectLabel className="text-violet-400/50">{t('courseSpecific')}</SelectLabel>
                                                        {courses.map(c => (
                                                            <SelectItem key={c.code} value={c.code} className="focus:bg-violet-500/10 focus:text-violet-200">{c.code} — {c.name}</SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <label className="text-xs font-medium text-violet-300/70 uppercase tracking-wider flex items-center gap-2">
                                            {t('pollOptions')}
                                            <span className="bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded text-[10px]">{pollOptions.length}/6</span>
                                        </label>
                                        <div className="space-y-2">
                                            {pollOptions.map((opt, idx) => (
                                                <div key={idx} className="flex gap-2 group">
                                                    <div className="flex-1 relative">
                                                        <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-violet-500/40 group-focus-within:bg-violet-400 transition-colors" />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder={t('option', { number: idx + 1 })}
                                                            value={opt}
                                                            onChange={(e) => {
                                                                const updated = [...pollOptions];
                                                                updated[idx] = e.target.value;
                                                                setPollOptions(updated);
                                                            }}
                                                            className="w-full bg-zinc-950/60 border border-violet-900/40 rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:ring-2 focus:ring-violet-500 outline-none transition-all focus:border-violet-500/50"
                                                        />
                                                    </div>
                                                    {pollOptions.length > 2 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-10 w-10 text-zinc-500 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-red-400 hover:bg-red-500/10 rounded-xl shrink-0 transition-all border border-transparent hover:border-red-500/20"
                                                            onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                                                        >
                                                            <Minus className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        {pollOptions.length < 6 && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="border-dashed border-violet-800/50 bg-violet-950/30 text-violet-300 hover:text-violet-200 hover:bg-violet-900/40 hover:border-violet-600/50 rounded-xl w-full h-10 transition-all"
                                                onClick={() => setPollOptions([...pollOptions, ''])}
                                            >
                                                <Plus className="w-3.5 h-3.5 me-1.5" /> {t('addOption')}
                                            </Button>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-5 items-center bg-violet-950/30 p-3 rounded-xl border border-violet-900/30">
                                        <label className="flex items-center gap-2.5 text-xs font-medium text-violet-200 cursor-pointer group">
                                            <div className="relative flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={pollAllowMultiple}
                                                    onChange={(e) => setPollAllowMultiple(e.target.checked)}
                                                    className="w-4 h-4 rounded border-violet-700/50 bg-zinc-950/80 text-violet-500 focus:ring-violet-500/50 focus:ring-offset-0 focus:ring-2 transition-all cursor-pointer peer"
                                                />
                                            </div>
                                            <span className="group-hover:text-violet-100 transition-colors uppercase tracking-wider text-[10px]">{t('allowMultiple')}</span>
                                        </label>
                                        
                                        <div className="h-4 w-px bg-violet-900/50 hidden sm:block" />

                                        <div className="flex items-center gap-3 flex-1">
                                            <label className="text-[10px] font-medium text-violet-300/70 uppercase tracking-wider shrink-0">{t('deadline')}</label>
                                            <input
                                                type="datetime-local"
                                                value={pollEndsAt}
                                                onChange={(e) => setPollEndsAt(e.target.value)}
                                                className="w-full sm:w-auto bg-zinc-950/80 border border-violet-900/40 rounded-lg px-3 py-1.5 text-xs text-violet-100 focus:ring-2 focus:ring-violet-500 outline-none transition-all focus:border-violet-500/50"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 justify-end pt-2">
                            <Button type="button" variant="ghost" onClick={() => setShowCompose(false)} className="rounded-xl hover:bg-zinc-800 text-zinc-300">
                                {t('cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    sending || 
                                    (composeType === 'poll' ? (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) : (!composeTitle.trim() || !composeMessage.trim()))
                                }
                                className={`rounded-xl px-6 transition-all shadow-lg ${
                                    composeType === 'poll' 
                                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-600/20' 
                                        : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-500/20'
                                } text-white`}
                            >
                                {sending ? <Loader2 className="w-4 h-4 animate-spin me-2 text-white/70" /> : <Send className="w-4 h-4 me-2" />}
                                {t('send')}
                            </Button>
                        </div>
                    </form>
                )}

                {/* Filter Bar */}
                {isAdmin && (
                    <div className="mb-6 space-y-3">
                        {/* Type Tabs */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                                <Filter className="w-3.5 h-3.5" />
                                {t('filter')}:
                            </div>
                            <div className="flex gap-1.5 flex-wrap">
                                <button
                                    onClick={() => { setFilterCategory('all'); setFilterType('all'); }}
                                    className={`px-3 py-1.5 text-xs rounded-full border transition-all font-medium ${
                                        filterCategory === 'all' && filterType === 'all'
                                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                                    }`}
                                >
                                    {t('allFilter')}
                                </button>
                                {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                                    <button
                                        key={key}
                                        onClick={() => { setFilterType(key); setFilterCategory('all'); }}
                                        className={`px-3 py-1.5 text-xs rounded-full border transition-all font-medium ${
                                            filterType === key
                                                ? `${config.bg} ${config.border} ${config.accent}`
                                                : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                                        }`}
                                    >
                                        {t(config.labelKey)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Category Tabs (courses) */}
                        {filterType === 'all' && (
                            <div className="flex gap-1.5 flex-wrap ms-[70px]">
                                <button
                                    onClick={() => setFilterCategory('general')}
                                    className={`px-3 py-1.5 text-xs rounded-full border transition-all font-medium ${
                                        filterCategory === 'general'
                                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                                    }`}
                                >
                                    {t('generalFilter')}
                                </button>
                                {courses.filter(c => usedCategories.has(c.code)).map(c => (
                                    <button
                                        key={c.code}
                                        onClick={() => setFilterCategory(c.code)}
                                        className={`px-3 py-1.5 text-xs rounded-full border transition-all font-medium flex items-center gap-1 ${
                                            filterCategory === c.code
                                                ? `${getCourseColor(c.code)} border-current`
                                                : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                                        }`}
                                    >
                                        <BookOpen className="w-3 h-3" />
                                        {shortCourseName(c.name)}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Section Dropdown */}
                        <div className="flex items-center gap-3">
                            <Select value={filterSection} onValueChange={setFilterSection}>
                                <SelectTrigger className="bg-zinc-900/80 border-zinc-800 rounded-lg text-xs text-zinc-400 h-8 w-[160px]">
                                    <SelectValue placeholder="All sections" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-700 max-h-[300px]">
                                    <SelectItem value="all">{t('allSections')}</SelectItem>
                                    {['A', 'B', 'C', 'D'].map(g => (
                                        <SelectGroup key={g}>
                                            <SelectLabel className="text-zinc-500 text-xs">{t('groupLabel', { letter: g })}</SelectLabel>
                                            {[1, 2, 3, 4].map(n => (
                                                <SelectItem key={`${g}${n}`} value={`${g}${n}`}>{t('sectionLabel', { code: `${g}${n}` })}</SelectItem>
                                            ))}
                                        </SelectGroup>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span className="text-xs text-zinc-600 ms-auto">{visibleNotifications.length} {t('total')}</span>
                        </div>
                    </div>
                )}

                {/* Count for non-admin */}
                {!isAdmin && (
                    <div className="mb-6">
                        <span className="text-xs text-zinc-600">{visibleNotifications.length} {t('total')}</span>
                    </div>
                )}

                {/* Announcements List */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                    </div>
                ) : visibleNotifications.length === 0 ? (
                    <div className="text-center py-20">
                        <Megaphone className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                        <p className="text-zinc-500">{t('noAnnouncements')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {visibleNotifications.map((n) => {
                            const isExpanded = expandedIds.has(n.id);
                            const isLong = n.message.length > 200;
                            const displayMessage = isLong && !isExpanded
                                ? n.message.slice(0, 200) + '...'
                                : n.message;
                            const canModify = canPost && (
                                isAdmin || n.sender_username === userName
                            );
                            const typeConfig = TYPE_CONFIG[n.type] || TYPE_CONFIG.announcement;
                            const cardBorder = getCardBorder(n);

                            if (editingId === n.id) {
                                return (
                                    <div key={n.id} className="glass-card rounded-2xl p-5 border border-blue-500/20 space-y-3">
                                        <input
                                            value={editForm.title}
                                            onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder={t('titlePlaceholder')}
                                        />
                                        <textarea
                                            value={editForm.message}
                                            onChange={e => setEditForm(prev => ({ ...prev, message: e.target.value }))}
                                            className="w-full bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[100px]"
                                            placeholder={t('messagePlaceholder')}
                                            rows={5}
                                        />
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="rounded-xl" disabled={actionLoading}>
                                                <X className="w-4 h-4 me-1" /> {t('cancel')}
                                            </Button>
                                            <Button size="sm" onClick={handleUpdate} className="bg-blue-600 hover:bg-blue-500 rounded-xl" disabled={actionLoading}>
                                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin me-1" /> : <Save className="w-4 h-4 me-1" />}
                                                {t('save')}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={n.id} className={`glass-card rounded-2xl p-5 sm:p-6 transition-all duration-300 group ${cardBorder} ${n.is_read ? 'opacity-60 grayscale-[0.2]' : 'hover:border-blue-500/20 shadow-md'}`}>
                                    {/* Header row */}
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                {/* Pin badge */}
                                                {n.is_pinned && (
                                                    <span className="text-amber-400 shrink-0" title="Pinned">
                                                        <Pin className="w-3.5 h-3.5" />
                                                    </span>
                                                )}
                                                {!n.is_read && (
                                                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] shrink-0" title="Unread" />
                                                )}
                                                <h3 className={`font-bold text-base sm:text-lg ${!n.is_read ? 'text-zinc-50' : 'text-zinc-200'}`}>{n.title}</h3>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {/* Type badge */}
                                                {n.type && n.type !== 'announcement' && (
                                                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${typeConfig.accent} ${typeConfig.bg} ${typeConfig.border}`}>
                                                        {t(typeConfig.labelKey)}
                                                    </span>
                                                )}
                                                <span className="text-[11px] px-2 py-0.5 rounded-full border font-medium text-blue-400 bg-blue-500/10 border-blue-500/30">
                                                    {n.sender_username}
                                                </span>
                                                {/* Course category badge */}
                                                {n.category ? (
                                                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${getCourseColor(n.category)}`}>
                                                        <BookOpen className="w-2.5 h-2.5" />
                                                        {getCourseName(n.category)}
                                                    </span>
                                                ) : null}
                                                {/* Target badge */}
                                                {n.target_section ? (
                                                    <span className="text-[11px] text-amber-500 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                                        → {n.target_section}
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-emerald-500 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                        {tn('toAll')}
                                                    </span>
                                                )}
                                                <span className="text-[11px] text-zinc-600">
                                                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                        </div>

                                        {canModify && (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                {/* Pin button (admin only) */}
                                                {isAdmin && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={`h-8 w-8 rounded-lg ${n.is_pinned ? 'text-amber-400 hover:text-amber-300 bg-amber-500/10' : 'text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10'}`}
                                                        onClick={() => handleTogglePin(n.id)}
                                                        title={n.is_pinned ? t('unpin') : t('pinToTop')}
                                                    >
                                                        <Pin className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg"
                                                    onClick={() => startEdit(n)}
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                                                    onClick={() => handleDelete(n.id)}
                                                    disabled={actionLoading}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Urgent banner */}
                                    {n.type === 'urgent' && (
                                        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                                            <span className="text-xs text-red-300 font-medium">This is an urgent notification</span>
                                        </div>
                                    )}

                                    {/* Message body */}
                                    <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">
                                        {displayMessage}
                                    </p>

                                    {isLong && (
                                        <button
                                            onClick={() => toggleExpand(n.id)}
                                            className="mt-2 text-xs text-blue-400/80 hover:text-blue-300 flex items-center gap-1 transition-colors"
                                        >
                                            {isExpanded ? (
                                                <><ChevronUp className="w-3.5 h-3.5" /> {t('showLess')}</>
                                            ) : (
                                                <><ChevronDown className="w-3.5 h-3.5" /> {t('readMore')}</>
                                            )}
                                        </button>
                                    )}

                                    {/* Admin View Reads Button */}
                                    {isAdmin && (
                                        <div className="mt-4 pt-3 border-t border-zinc-800/50 flex flex-col gap-2">
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={async () => {
                                                        if (showReadsFor === n.id) {
                                                            setShowReadsFor(null);
                                                            return;
                                                        }
                                                        if (!readsDetails[n.id]) {
                                                            setLoadingReads(n.id);
                                                            const res = await getNotificationReads(n.id);
                                                            if (res.success && res.readers) {
                                                                setReadsDetails(prev => ({ ...prev, [n.id]: res.readers }));
                                                            }
                                                            setLoadingReads(null);
                                                        }
                                                        setShowReadsFor(n.id);
                                                    }}
                                                    className="text-[11px] font-medium text-blue-400/80 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 hover:border-blue-500/40 px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5"
                                                >
                                                    {loadingReads === n.id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <Eye className="w-3 h-3" />
                                                    )}
                                                    {showReadsFor === n.id ? 'Hide Viewers' : 'View Read Receipts'}
                                                </button>
                                            </div>
                                            
                                            {/* Admin Reads Panel */}
                                            {showReadsFor === n.id && readsDetails[n.id] && (
                                                <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-3 mt-1 max-h-[300px] overflow-y-auto">
                                                    <div className="text-xs font-semibold text-zinc-300 mb-2 flex justify-between items-center">
                                                        <span>Seen by {readsDetails[n.id].length} people</span>
                                                    </div>
                                                    {readsDetails[n.id].length > 0 ? (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {readsDetails[n.id].map(reader => (
                                                                <span
                                                                    key={reader.username}
                                                                    className="text-[10px] bg-zinc-800/80 text-zinc-300 border border-zinc-700/40 px-2.5 py-1 rounded-md flex items-center gap-1.5"
                                                                    title={reader.username}
                                                                >
                                                                    {reader.fullName}
                                                                    {reader.section && (
                                                                        <span className="text-blue-400/80 border-l border-zinc-600 pl-1.5 ml-0.5">{reader.section}</span>
                                                                    )}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-zinc-500">No one has read this yet.</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Poll Widget */}
                                    {n.poll && (
                                        <PollWidget
                                            poll={n.poll}
                                            onVote={handleVote}
                                            onRemoveVote={handleRemoveVote}
                                            t={t}
                                            canViewVoters={userRole === 'admin' || userRole === 'super_admin'}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
