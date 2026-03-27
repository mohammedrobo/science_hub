'use client';

import { useState, useEffect, useCallback } from 'react';
import { Megaphone, Send, Loader2, Trash2, Edit2, Save, X, Filter, ChevronDown, ChevronUp, Pin } from 'lucide-react';
import { getNotifications, sendNotification, deleteNotification, updateNotification, type Notification } from '@/app/actions/notifications';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface AnnouncementsPageProps {
    userRole: 'super_admin' | 'admin' | 'leader' | 'student';
    userSection?: string | null;
    userName?: string;
}

export default function AnnouncementsClient({ userRole, userSection, userName }: AnnouncementsPageProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // Compose state
    const canPost = userRole === 'super_admin' || userRole === 'admin' || userRole === 'leader';
    const [showCompose, setShowCompose] = useState(false);
    const [composeTitle, setComposeTitle] = useState('');
    const [composeMessage, setComposeMessage] = useState('');
    const [composeTarget, setComposeTarget] = useState<string>('all');
    const [sending, setSending] = useState(false);

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

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!composeTitle.trim() || !composeMessage.trim()) return;

        setSending(true);
        const targetSection = (userRole === 'super_admin' || userRole === 'admin')
            ? (composeTarget === 'all' ? null : composeTarget)
            : userSection;

        const result = await sendNotification(composeTitle, composeMessage, targetSection || null);

        if (result.success) {
            toast.success(t('sent'));
            setComposeTitle('');
            setComposeMessage('');
            setComposeTarget('all');
            setShowCompose(false);
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

    // Filter logic
    const filtered = filter === 'all'
        ? notifications
        : notifications.filter(n => n.target_section === filter || !n.target_section);

    const getRoleBadge = (n: Notification) => {
        if (n.sender_role === 'super_admin') return { label: tn('superAdmin'), color: 'text-red-400 bg-red-500/10 border-red-500/30' };
        if (n.sender_role === 'admin') return { label: tn('admin'), color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
        return { label: n.sender_full_name || tn('leader'), color: 'text-violet-400 bg-violet-500/10 border-violet-500/30' };
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

                        {/* Target (Admin/Super Admin) */}
                        {(userRole === 'super_admin' || userRole === 'admin') && (
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-400">{t('targetAudience')}</label>
                                <select
                                    value={composeTarget}
                                    onChange={(e) => setComposeTarget(e.target.value)}
                                    className="w-full bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="all">{t('everyone')}</option>
                                    <optgroup label="Groups">
                                        <option value="group_A">Group A</option>
                                        <option value="group_B">Group B</option>
                                        <option value="group_C">Group C</option>
                                        <option value="group_D">Group D</option>
                                    </optgroup>
                                    <optgroup label="Sections">
                                        {['A', 'B', 'C', 'D'].flatMap(g =>
                                            [1, 2, 3, 4].map(n => (
                                                <option key={`${g}${n}`} value={`${g}${n}`}>Section {g}{n}</option>
                                            ))
                                        )}
                                    </optgroup>
                                </select>
                            </div>
                        )}

                        {userRole === 'leader' && (
                            <div className="text-sm text-zinc-400 bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-800">
                                {t('sendingTo')}: <span className="text-blue-400 font-bold">{userSection}</span>
                            </div>
                        )}

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

                        <div className="flex gap-3 justify-end">
                            <Button type="button" variant="ghost" onClick={() => setShowCompose(false)} className="rounded-xl">
                                {t('cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={sending || !composeTitle.trim() || !composeMessage.trim()}
                                className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-6"
                            >
                                {sending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Send className="w-4 h-4 me-2" />}
                                {t('send')}
                            </Button>
                        </div>
                    </form>
                )}

                {/* Filter Bar */}
                <div className="flex items-center gap-3 mb-6 flex-wrap">
                    <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                        <Filter className="w-3.5 h-3.5" />
                        {t('filter')}:
                    </div>
                    <div className="flex gap-1 flex-wrap">
                        {['all', 'A1', 'A2', 'B1', 'B2'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1 text-xs rounded-full border transition-all ${
                                    filter === f
                                        ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                                        : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                                }`}
                            >
                                {f === 'all' ? t('allFilter') : f}
                            </button>
                        ))}
                    </div>
                    <span className="text-xs text-zinc-600 ms-auto">{filtered.length} {t('total')}</span>
                </div>

                {/* Announcements List */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <Megaphone className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                        <p className="text-zinc-500">{t('noAnnouncements')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map((n) => {
                            const isExpanded = expandedIds.has(n.id);
                            const isLong = n.message.length > 200;
                            const displayMessage = isLong && !isExpanded
                                ? n.message.slice(0, 200) + '...'
                                : n.message;
                            const badge = getRoleBadge(n);
                            const canModify = canPost && (
                                userRole === 'super_admin' || userRole === 'admin' || n.sender_username === userName
                            );

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
                                <div key={n.id} className="glass-card rounded-2xl p-5 sm:p-6 hover:border-blue-500/20 transition-all duration-300 group">
                                    {/* Header row */}
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-base sm:text-lg text-zinc-100 mb-1">{n.title}</h3>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${badge.color}`}>
                                                    {badge.label}
                                                </span>
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
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
