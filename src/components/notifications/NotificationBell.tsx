'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Trash2, ChevronDown, ChevronUp, Pin, BarChart3, AlertTriangle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getNotifications, clearAllNotifications, markNotificationAsRead } from '@/app/actions/notifications';
import type { Notification } from '@/types/notifications';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { EXAM_MODE_ENABLED, examModeValue } from '@/lib/exam-mode';

interface NotificationBellProps {
    userRole?: 'super_admin' | 'admin' | 'leader' | 'student' | 'doctor';
}

const REFRESH_INTERVAL_MS = examModeValue(
    30 * 60 * 1000,
    60 * 60 * 1000
); // 30m normal, 60m exam mode
const MIN_REFETCH_GAP_MS = examModeValue(
    10 * 60 * 1000,
    20 * 60 * 1000
); // 10m normal, 20m exam mode burst throttle

const MESSAGE_PREVIEW_LENGTH = 120; // characters before "Read more"

export function NotificationBell({ userRole = 'student' }: NotificationBellProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isClearing, setIsClearing] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const canManage = userRole === 'super_admin' || userRole === 'admin' || userRole === 'doctor' || userRole === 'leader';
    const t = useTranslations('notifications');
    const lastFetchRef = useRef(0);
    const isFetchingRef = useRef(false);

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
                // Optimistically update
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
                
                try {
                    await markNotificationAsRead(id);
                } catch (err) {
                    console.error("Failed to mark as read", err);
                }
            }
        }
    };

    const refreshNotifications = useCallback(async (force = false) => {
        const now = Date.now();
        if (!force && (now - lastFetchRef.current) < MIN_REFETCH_GAP_MS) return;
        if (isFetchingRef.current) return;

        isFetchingRef.current = true;
        try {
            const data = await getNotifications();
            // Filter to only show unread notifications in the Bell dropdown!
            const unreadOnly = data.filter(n => !n.is_read);
            setNotifications(unreadOnly);
            setUnreadCount(unreadOnly.length);
            lastFetchRef.current = Date.now();
        } finally {
            isFetchingRef.current = false;
        }
    }, []);

    useEffect(() => {
        if (EXAM_MODE_ENABLED) {
            // In exam mode, notifications are fetched on-demand (when bell opens).
            return;
        }

        refreshNotifications(true);

        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                refreshNotifications();
            }
        }, REFRESH_INTERVAL_MS);

        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                refreshNotifications();
            }
        };
        const onFocus = () => refreshNotifications();

        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('focus', onFocus);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('focus', onFocus);
        };
    }, [refreshNotifications]);

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);

        if (open) {
            refreshNotifications(true);
        }
    };

    const handleClearAll = async () => {
        const confirmMsg = (userRole === 'super_admin' || userRole === 'admin')
            ? t('clearAllAdmin')
            : t('clearAllLeader');
        
        if (!confirm(confirmMsg)) return;
        
        setIsClearing(true);
        const result = await clearAllNotifications();
        setIsClearing(false);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(result.message || t('notificationsCleared'));
            // Refresh notifications
            await refreshNotifications(true);
            setUnreadCount(0);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <button className="relative p-2 rounded-full hover:bg-white/10 transition-colors">
                    <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-primary animate-pulse' : 'text-zinc-400'}`} />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black" />
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent 
                className="w-[calc(100vw-24px)] sm:w-96 max-w-[420px] p-0 bg-zinc-900 border-zinc-800 shadow-xl" 
                align="end"
                sideOffset={8}
            >
                <div className="p-3 border-b border-zinc-800 font-medium text-sm flex justify-between items-center bg-zinc-900/80 backdrop-blur-sm">
                    <span className="text-zinc-100">{t('title')}</span>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && <span className="text-xs text-primary">{t('new', { count: unreadCount })}</span>}
                        {canManage && notifications.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClearAll}
                                disabled={isClearing}
                                className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                                <Trash2 className="w-3 h-3 me-1" />
                                {t('clear')}
                            </Button>
                        )}
                    </div>
                </div>
                <div className="max-h-[70vh] sm:max-h-[450px] overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 text-sm">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            {t('noNotifications')}
                        </div>
                    ) : (
                        notifications.map((n) => {
                            const isExpanded = expandedIds.has(n.id);
                            const isLong = n.message.length > MESSAGE_PREVIEW_LENGTH;
                            const displayMessage = isLong && !isExpanded
                                ? n.message.slice(0, MESSAGE_PREVIEW_LENGTH) + '...'
                                : n.message;

                            return (
                                <div 
                                    key={n.id} 
                                    onClick={async () => {
                                        if (!n.is_read) {
                                            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
                                            setUnreadCount(prev => Math.max(0, prev - 1));
                                            try { await markNotificationAsRead(n.id); } catch {}
                                        }
                                    }}
                                    className={`p-3 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-all cursor-pointer ${n.is_read ? 'opacity-40 grayscale-[0.5]' : ''} ${n.type === 'urgent' ? 'border-l-2 border-l-red-500/60' : n.type === 'poll' ? 'border-l-2 border-l-violet-500/60' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {n.is_pinned && <Pin className="w-3 h-3 text-amber-400 shrink-0" />}
                                            {n.type === 'urgent' && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
                                            {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.8)]" title="Unread" />}
                                            <h4 className={`font-semibold text-sm truncate ${!n.is_read ? 'text-zinc-50' : 'text-zinc-300'}`}>{n.title}</h4>
                                        </div>
                                        <span className="text-[10px] text-zinc-500 whitespace-nowrap ms-2">
                                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-400 whitespace-pre-wrap break-words leading-relaxed">
                                        {displayMessage}
                                    </p>
                                    {isLong && (
                                        <button
                                            onClick={() => toggleExpand(n.id)}
                                            className="mt-1 text-[11px] text-primary/80 hover:text-primary flex items-center gap-0.5 transition-colors"
                                        >
                                            {isExpanded ? (
                                                <><ChevronUp className="w-3 h-3" /> Show less</>
                                            ) : (
                                                <><ChevronDown className="w-3 h-3" /> Read more</>
                                            )}
                                        </button>
                                    )}
                                    <div className="mt-2 flex items-center justify-between flex-wrap gap-1">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-primary/70 px-1.5 py-0.5 rounded-full bg-primary/10 font-medium">
                                                {n.sender_username}
                                            </span>
                                            {n.poll && (
                                                <span className="text-[10px] text-violet-400 px-1.5 py-0.5 rounded-full bg-violet-500/10 font-medium flex items-center gap-0.5">
                                                    <BarChart3 className="w-2.5 h-2.5" /> Poll
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {n.target_section ? (
                                                <span className="text-[10px] text-amber-500 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                                    → {n.target_section}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-emerald-500 border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                                    {t('toAll')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
