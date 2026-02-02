'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
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
                                    // New content available, refresh to update
                                    console.log('New content available, refresh to update');
                                }
                            });
                        }
                    });
                })
                .catch((error) => {
                    console.log('SW registration failed:', error);
                });
        }
    }, []);

    return null;
}
