'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function ServiceWorkerRegistration() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
            return;
        }

        // Register in both dev (for testing) and production
        const registerSW = async () => {
            try {
                const reg = await navigator.serviceWorker.register('/sw.js', { 
                    scope: '/',
                    updateViaCache: 'none' // Always check for updates
                });
                
                setRegistration(reg);
                console.log('[SW] Registered:', reg.scope);

                // Check for updates immediately
                reg.update();

                // Check for updates every 5 minutes
                const updateInterval = setInterval(() => {
                    reg.update();
                }, 5 * 60 * 1000);

                // Handle update found
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (!newWorker) return;

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New version available
                            setUpdateAvailable(true);
                            toast.info('Update available! Click to refresh.', {
                                duration: 10000,
                                action: {
                                    label: 'Update',
                                    onClick: () => {
                                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                                        window.location.reload();
                                    }
                                }
                            });
                        }
                    });
                });

                // Handle controller change (new SW took over)
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (updateAvailable) {
                        window.location.reload();
                    }
                });

                return () => clearInterval(updateInterval);
            } catch (error) {
                console.warn('[SW] Registration failed:', error);
            }
        };

        registerSW();
    }, [updateAvailable]);

    // Force update function (can be triggered manually)
    useEffect(() => {
        // @ts-ignore - Add to window for debugging
        window.__updateSW = async () => {
            if (registration) {
                await registration.update();
                toast.info('Checking for updates...');
            }
        };
    }, [registration]);

    return null;
}
