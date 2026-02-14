'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { logPageView } from '@/app/tracking/actions';

export function PageTracker() {
    const pathname = usePathname();
    const lastLoggedRef = useRef<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!pathname) return;

        // Deduplicate: don't log the same path twice in a row
        if (pathname === lastLoggedRef.current) return;

        // Debounce: wait 500ms to avoid logging rapid redirects / back-forth
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            lastLoggedRef.current = pathname;
            // Fire and forget
            logPageView(pathname);
        }, 500);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [pathname]);

    return null;
}
