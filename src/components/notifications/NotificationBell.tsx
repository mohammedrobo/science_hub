'use client';

import { useState, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getNotifications, type Notification } from '@/app/actions/notifications';
import { formatDistanceToNow } from 'date-fns';

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Initial fetch
    useEffect(() => {
        const fetch = async () => {
            const data = await getNotifications();
            setNotifications(data);

            // For now, assume all local fetch is "unread" until clicked?
            // Or just store "last read timestamp" in localStorage for simplicity.
            const lastRead = localStorage.getItem('last_read_notification');
            if (!lastRead) {
                setUnreadCount(data.length);
            } else {
                const count = data.filter(n => new Date(n.created_at) > new Date(lastRead)).length;
                setUnreadCount(count);
            }
        };
        fetch();

        // Optional: Poll every 60s
        const interval = setInterval(fetch, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open && notifications.length > 0) {
            setUnreadCount(0);
            localStorage.setItem('last_read_notification', new Date().toISOString());
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
            <PopoverContent className="w-80 p-0 bg-zinc-900 border-zinc-800" align="end">
                <div className="p-3 border-b border-zinc-800 font-medium text-sm flex justify-between items-center bg-zinc-900/50">
                    <span>Notifications</span>
                    {unreadCount > 0 && <span className="text-xs text-primary">{unreadCount} new</span>}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 text-sm">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            No notifications yet
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <div key={n.id} className="p-3 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-semibold text-sm text-foreground">{n.title}</h4>
                                    <span className="text-[10px] text-zinc-500 whitespace-nowrap ml-2">
                                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-400 line-clamp-2">{n.message}</p>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="text-[10px] text-primary/70 px-1.5 py-0.5 rounded-full bg-primary/10 font-medium">
                                        {n.sender_role === 'admin' ? 'Admin Team' : `Leader of ${n.sender_section || 'Group'}`}
                                    </span>
                                    {n.target_section && (
                                        <span className="text-[10px] text-zinc-600 border border-zinc-800 px-1.5 py-0.5 rounded">
                                            {n.target_section}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
