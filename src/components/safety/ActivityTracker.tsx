'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { startActiveSession, heartbeat, endActiveSession } from '@/app/tracking/heartbeat';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

function generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * ActivityTracker — Tracks real active time on the website.
 * 
 * - Sends a heartbeat every 30 seconds while the user is active
 * - Pauses when the tab is hidden (not counting inactive time)
 * - Ends the session on tab close / navigate away
 * - Tracks which pages the user visits during the session
 */
export function ActivityTracker() {
    const pathname = usePathname();
    const sessionIdRef = useRef<string | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isActiveRef = useRef(true);
    const startedRef = useRef(false);
    const failedRef = useRef(false); // Don't retry if table doesn't exist

    const sendHeartbeat = useCallback(async () => {
        if (!sessionIdRef.current || !isActiveRef.current || failedRef.current) return;
        try {
            const result = await heartbeat(sessionIdRef.current, window.location.pathname);
            if (result?.error === 'table_not_ready') {
                failedRef.current = true;
            }
        } catch {
            // Network error — ignore, next heartbeat will retry
        }
    }, []);

    // Start session on mount
    useEffect(() => {
        if (startedRef.current || failedRef.current) return;
        startedRef.current = true;

        const sid = generateSessionId();
        sessionIdRef.current = sid;

        startActiveSession(sid, pathname).then(result => {
            if (result?.error === 'table_not_ready') {
                failedRef.current = true;
                return;
            }

            // Start heartbeat interval
            intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
        });

        // Cleanup on unmount (page close)
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (sessionIdRef.current && !failedRef.current) {
                // Best-effort end session (sendBeacon would be better but we use server actions)
                endActiveSession(sessionIdRef.current).catch(() => {});
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Track page changes within the session
    useEffect(() => {
        if (!sessionIdRef.current || failedRef.current) return;
        // Send a heartbeat on page change to update current_page
        sendHeartbeat();
    }, [pathname, sendHeartbeat]);

    // Pause heartbeat when tab is hidden, resume when visible
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                isActiveRef.current = true;
                // Send immediate heartbeat on return
                sendHeartbeat();
                // Restart interval
                if (!intervalRef.current && !failedRef.current) {
                    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
                }
            } else {
                isActiveRef.current = false;
                // Stop interval while hidden — don't count inactive time
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [sendHeartbeat]);

    // Best-effort session end on tab close
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (sessionIdRef.current && !failedRef.current) {
                // Use navigator.sendBeacon for reliability during unload
                // Since we can't call server actions in sendBeacon, we'll rely on
                // the stale session cleanup on the server side (2 minute timeout)
                // The session will be auto-closed when no more heartbeats come in.
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    return null;
}
