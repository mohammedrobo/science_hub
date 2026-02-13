'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
            return;
        }

        const registerSW = async () => {
            try {
                const reg = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/',
                    updateViaCache: 'none'
                });

                // Check for updates periodically
                const intervalId = setInterval(() => {
                    reg.update();
                }, 60 * 60 * 1000); // Every hour

                // Listen for new workers installing
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (!newWorker) return;

                    newWorker.addEventListener('statechange', () => {
                        // If we have a controller and new worker is waiting -> UPDATE AUTOMATICALLY
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('[SW] New update found. Installing silently...');

                            // 1. Send signal to skip waiting (activate immediately)
                            newWorker.postMessage({ type: 'SKIP_WAITING' });

                            // 2. Set flag so we show notification on next load
                            localStorage.setItem('just_updated', 'true');
                        }
                    });
                });

                // When new worker takes over, reload the page to apply changes
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    window.location.reload();
                });

                return () => clearInterval(intervalId);

            } catch (error) {
                console.warn('[SW] Registration failed:', error);
            }
        };

        registerSW();
    }, []);

    // No UI anymore - completely silent
    return null;
}
