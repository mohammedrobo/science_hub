'use client';

import { useState, useEffect, useCallback } from 'react';
import { Megaphone, Send, Loader2, Trash2, Edit2, Save, X, Filter, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { getNotifications, sendNotification, deleteNotification, updateNotification, type Notification } from '@/app/actions/notifications';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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

export default function AnnouncementsClient({ userRole, userSection, userGroup, userName, courses = [] }: AnnouncementsPageProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState<string>('all'); // 'all' | 'general' | course code
    const [filterSection, setFilterSection] = useState<string>('all'); // 'all' | section like 'A1'
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // Compose state
    const canPost = userRole === 'super_admin' || userRole === 'admin' || userRole === 'leader' || userRole === 'doctor';
    const isAdmin = userRole === 'super_admin' || userRole === 'admin' || userRole === 'doctor';
    const [showCompose, setShowCompose] = useState(false);
    const [composeTitle, setComposeTitle] = useState('');
    const [composeMessage, setComposeMessage] = useState('');
    const [composeTarget, setComposeTarget] = useState<string>('all');
    const [composeCategory, setComposeCategory] = useState<string>('general');
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
        const targetSection = isAdmin
            ? (composeTarget === 'all' ? null : composeTarget)
            : userSection; // leaders send to their own section only

        const category = composeCategory === 'general' ? null : composeCategory;

        const result = await sendNotification(composeTitle, composeMessage, targetSection || null, category);

        if (result.success) {
            toast.success(t('sent'));
            setComposeTitle('');
            setComposeMessage('');
            setComposeTarget('all');
            setComposeCategory('general');
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

    // Build list of used categories from existing notifications
    const usedCategories = new Set(notifications.map(n => n.category).filter(Boolean));

    // ─── Visibility logic ───
    const visibleNotifications = (() => {
        let filtered = notifications;

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

                        {/* Category Selector (Admin/Doctor) */}
                        {isAdmin && courses.length > 0 && (
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-400">Category</label>
                                <select
                                    value={composeCategory}
                                    onChange={(e) => setComposeCategory(e.target.value)}
                                    className="w-full bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="general">📢 General Announcement</option>
                                    <optgroup label="📚 Course-specific">
                                        {courses.map(c => (
                                            <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>
                        )}

                        {/* Target (Admin/Super Admin only) */}
                        {isAdmin && (
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

                {/* Filter Bar — Admin/Doctor only */}
                {isAdmin && (
                    <div className="mb-6 space-y-3">
                        {/* Category Tabs */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                                <Filter className="w-3.5 h-3.5" />
                                {t('filter')}:
                            </div>
                            <div className="flex gap-1.5 flex-wrap">
                                <button
                                    onClick={() => setFilterCategory('all')}
                                    className={`px-3 py-1.5 text-xs rounded-full border transition-all font-medium ${
                                        filterCategory === 'all'
                                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                                    }`}
                                >
                                    {t('allFilter')}
                                </button>
                                <button
                                    onClick={() => setFilterCategory('general')}
                                    className={`px-3 py-1.5 text-xs rounded-full border transition-all font-medium ${
                                        filterCategory === 'general'
                                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                                    }`}
                                >
                                    📢 General
                                </button>
                                {/* Course tabs — only show courses that have at least 1 announcement */}
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
                        </div>

                        {/* Section Dropdown */}
                        <div className="flex items-center gap-3">
                            <select
                                value={filterSection}
                                onChange={(e) => setFilterSection(e.target.value)}
                                className="bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-400 focus:ring-1 focus:ring-blue-500 outline-none"
                            >
                                <option value="all">All sections</option>
                                {['A', 'B', 'C', 'D'].map(g => (
                                    <optgroup key={g} label={`Group ${g}`}>
                                        {[1, 2, 3, 4].map(n => (
                                            <option key={`${g}${n}`} value={`${g}${n}`}>Section {g}{n}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
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
