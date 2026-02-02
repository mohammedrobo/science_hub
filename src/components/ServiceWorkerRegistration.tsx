'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
    useEffect(() => {
        // Only register service worker in production
        if (
            typeof window !== 'undefined' &&
            'serviceWorker' in navigator &&
            process.env.NODE_ENV === 'production'
        ) {
            navigator.serviceWorker
                .register('/sw.js', { scope: '/' })
                .then((registration) => {
                    console.log('SW registered:', registration.scope);

                    // Check for updates periodically
                    registration.update();

                    // Handle updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    console.log('New content available, refresh to update');
                                }
                            });
                        }
                    });
                })
                .catch((error) => {
                    // Silently fail in development
                    if (process.env.NODE_ENV === 'production') {
                        console.warn('SW registration failed:', error);
                    }
                });
        }
    }, []);

    return null;
}
