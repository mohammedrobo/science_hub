'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getCurrentClassWithCountdown } from '@/app/schedule/actions';

interface ScheduleNotificationToggleProps {
    sectionId: string;
}

export function ScheduleNotificationToggle({ sectionId }: ScheduleNotificationToggleProps) {
    const [enabled, setEnabled] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [checkInterval, setCheckIntervalId] = useState<NodeJS.Timeout | null>(null);

    // Check if notifications are supported and get current permission
    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
            const savedPref = localStorage.getItem(`schedule_notifications_${sectionId}`);
            if (savedPref === 'true' && Notification.permission === 'granted') {
                setEnabled(true);
            }
        }
    }, [sectionId]);

    // Set up notification checking when enabled
    useEffect(() => {
        if (!enabled) {
            if (checkInterval) {
                clearInterval(checkInterval);
                setCheckIntervalId(null);
            }
            return;
        }

        // Check every minute
        const interval = setInterval(async () => {
            await checkAndNotify();
        }, 60000);

        setCheckIntervalId(interval);
        
        // Initial check
        checkAndNotify();

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [enabled, sectionId]);

    const checkAndNotify = async () => {
        if (!enabled || Notification.permission !== 'granted') return;

        try {
            const classInfo = await getCurrentClassWithCountdown(sectionId);
            
            if (classInfo.status === 'none') return;
            
            const nextClass = classInfo.status === 'current' ? classInfo.nextClass : classInfo.nextClass;
            const minutes = classInfo.minutesUntil;
            
            // Notify at specific intervals: 15 and 5 minutes before class
            const notifyAt = [15, 5];
            const shouldNotify = notifyAt.some(m => minutes >= m - 1 && minutes <= m + 1);
            
            // Check if we already notified for this class at this interval
            const notifyKey = `notified_${sectionId}_${nextClass?.subject}_${Math.round(minutes / 5) * 5}`;
            if (sessionStorage.getItem(notifyKey)) return;
            
            if (shouldNotify && nextClass) {
                // Mark as notified
                sessionStorage.setItem(notifyKey, 'true');
                
                // Send browser notification
                new Notification(`📚 ${nextClass.subject} in ${Math.round(minutes)} minutes`, {
                    body: `${nextClass.class_type}${nextClass.room ? ` • Room ${nextClass.room}` : ''}\nStarts at ${nextClass.time_start}:00`,
                    icon: '/icon.png',
                    badge: '/icon.png',
                    tag: `class-${sectionId}-${nextClass.subject}`,
                    requireInteraction: minutes <= 15
                });
            }
        } catch (error) {
            console.error('Error checking schedule for notifications:', error);
        }
    };

    const handleToggle = async () => {
        if (!('Notification' in window)) {
            toast.error('Browser notifications not supported');
            return;
        }

        if (!enabled) {
            // Request permission
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result === 'granted') {
                setEnabled(true);
                localStorage.setItem(`schedule_notifications_${sectionId}`, 'true');
                toast.success('Class reminders enabled! You\'ll get notified before each class.');
                
                // Send test notification
                new Notification('🔔 Notifications Enabled', {
                    body: 'You will receive reminders before your classes start.',
                    icon: '/icon.png'
                });
            } else if (result === 'denied') {
                toast.error('Notifications blocked. Enable them in your browser settings.');
            }
        } else {
            setEnabled(false);
            localStorage.setItem(`schedule_notifications_${sectionId}`, 'false');
            toast.info('Class reminders disabled');
        }
    };

    // Don't show on browsers that don't support notifications
    if (typeof window !== 'undefined' && !('Notification' in window)) {
        return null;
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            className={`
                gap-2 transition-all
                ${enabled 
                    ? 'bg-violet-600/20 border-violet-500/50 text-violet-400 hover:bg-violet-600/30' 
                    : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-700/50'
                }
            `}
            title={enabled ? 'Disable class reminders' : 'Enable class reminders'}
        >
            {enabled ? (
                <>
                    <BellRing className="w-4 h-4 animate-pulse" />
                    <span className="hidden sm:inline">Reminders On</span>
                </>
            ) : (
                <>
                    <BellOff className="w-4 h-4" />
                    <span className="hidden sm:inline">Enable Reminders</span>
                </>
            )}
        </Button>
    );
}
