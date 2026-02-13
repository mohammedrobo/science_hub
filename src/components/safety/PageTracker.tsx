'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { logPageView } from '@/app/tracking/actions';

export function PageTracker() {
    const pathname = usePathname();

    useEffect(() => {
        // Debounce or just log? 
        // For page views, we usually simply log the navigation.
        // We can add a small timeout to avoid logging rapid redirects/back-forth if needed, 
        // but simple useEffect on pathname change is standard.

        if (pathname) {
            // Fire and forget
            logPageView(pathname);
        }
    }, [pathname]);

    return null;
}
