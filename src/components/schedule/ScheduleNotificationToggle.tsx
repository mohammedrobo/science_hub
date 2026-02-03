'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ScheduleNotificationToggleProps {
    sectionId: string;
}

// Convert base64 to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer as ArrayBuffer;
}

export function ScheduleNotificationToggle({ sectionId }: ScheduleNotificationToggleProps) {
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isPushSupported, setIsPushSupported] = useState(false);

    // Check support and existing subscription on mount
    useEffect(() => {
        const checkSupport = async () => {
            // Check if Push API is supported
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                setIsPushSupported(true);
            }

            // Check if already subscribed
            if ('serviceWorker' in navigator) {
                try {
                    const registration = await navigator.serviceWorker.ready;
                    const subscription = await registration.pushManager.getSubscription();
                    if (subscription) {
                        const savedSection = localStorage.getItem('push_notification_section');
                        if (savedSection === sectionId) {
                            setEnabled(true);
                        }
                    }
                } catch (e) {
                    console.log('[Push] Error checking subscription:', e);
                }
            }
        };

        checkSupport();
    }, [sectionId]);

    const subscribeToPush = useCallback(async () => {
        if (!isPushSupported) {
            toast.error('Push notifications not supported on this browser');
            return false;
        }

        try {
            setLoading(true);

            // Request notification permission first
            const permission = await Notification.requestPermission();

            if (permission !== 'granted') {
                toast.error('Please allow notifications to receive class reminders on your phone.');
                return false;
            }

            // Get VAPID public key from server
            const keyResponse = await fetch('/api/push/subscribe');
            const { publicKey } = await keyResponse.json();

            if (!publicKey) {
                toast.error('Could not get push configuration');
                return false;
            }

            // Get service worker registration
            const registration = await navigator.serviceWorker.ready;

            // Check for existing subscription
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                // Create new subscription
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicKey)
                });
            }

            // Send subscription to server
            const response = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscription: subscription.toJSON(),
                    sectionId
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to subscribe');
            }

            // Save section ID for later checks
            localStorage.setItem('push_notification_section', sectionId);

            return true;
        } catch (error: any) {
            console.error('[Push] Subscribe error:', error);
            toast.error(error.message || 'Failed to enable notifications');
            return false;
        } finally {
            setLoading(false);
        }
    }, [isPushSupported, sectionId]);

    const unsubscribeFromPush = useCallback(async () => {
        try {
            setLoading(true);

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                // Remove from server
                await fetch('/api/push/subscribe', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        endpoint: subscription.endpoint
                    })
                });

                // Unsubscribe locally
                await subscription.unsubscribe();
            }

            localStorage.removeItem('push_notification_section');
            return true;
        } catch (error: any) {
            console.error('[Push] Unsubscribe error:', error);
            toast.error('Failed to disable notifications');
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const handleToggle = async () => {
        if (!enabled) {
            // Subscribe
            const success = await subscribeToPush();
            if (success) {
                setEnabled(true);
                toast.success('📱 Phone notifications enabled! You\'ll get alerts 15 and 5 min before class.', {
                    duration: 5000
                });

                // Send test notification via service worker
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('🔔 Phone Alerts Enabled!', {
                        body: 'You\'ll receive reminders even when your phone is locked!',
                        icon: '/icon.png',
                        badge: '/icon.png'
                    });
                }
            }
        } else {
            // Unsubscribe
            const success = await unsubscribeFromPush();
            if (success) {
                setEnabled(false);
                toast.info('Notifications disabled');
            }
        }
    };

    // Show appropriate message for unsupported browsers
    if (typeof window !== 'undefined' && !isPushSupported && !('Notification' in window)) {
        return (
            <Button
                variant="outline"
                size="sm"
                disabled
                className="gap-2 bg-zinc-800/50 border-zinc-700 text-zinc-500"
            >
                <BellOff className="w-4 h-4" />
                <span className="hidden sm:inline">Not Supported</span>
            </Button>
        );
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            disabled={loading}
            className={`
                gap-2 transition-all
                ${enabled 
                    ? 'bg-green-600/20 border-green-500/50 text-green-400 hover:bg-green-600/30' 
                    : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-700/50'
                }
            `}
            title={enabled ? 'Disable phone notifications' : 'Get notified on your phone'}
        >
            {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : enabled ? (
                <>
                    <Smartphone className="w-4 h-4 text-green-400" />
                    <span className="hidden sm:inline">📱 Alerts On</span>
                </>
            ) : (
                <>
                    <Bell className="w-4 h-4" />
                    <span className="hidden sm:inline">📱 Phone Alerts</span>
                </>
            )}
        </Button>
    );
}
