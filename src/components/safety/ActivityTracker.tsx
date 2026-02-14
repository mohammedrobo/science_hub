'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { startActiveSession, heartbeat, endActiveSession } from '@/app/tracking/heartbeat';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const SESSION_STORAGE_KEY = 'sciencehub_active_session';

function generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Check if another tab already owns a session to prevent duplicates.
 * Uses localStorage with a timestamp — if the existing session is fresh
 * (heartbeat within the last 60s), we skip creating a new one.
 */
function getExistingSession(): { sessionId: string; username: string } | null {
    try {
        const raw = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        // Session is "alive" if heartbeat was within the last 60 seconds
        if (parsed.lastHeartbeat && Date.now() - parsed.lastHeartbeat < 60000) {
            return { sessionId: parsed.sessionId, username: parsed.username };
        }
        // Stale — clear it
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
    } catch {
        return null;
    }
}

function claimSession(sessionId: string, username: string) {
    try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
            sessionId,
            username,
            lastHeartbeat: Date.now(),
        }));
    } catch { /* quota exceeded — ignore */ }
}

function updateSessionHeartbeat() {
    try {
        const raw = localStorage.getItem(SESSION_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            parsed.lastHeartbeat = Date.now();
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(parsed));
        }
    } catch { /* ignore */ }
}

function releaseSession() {
    try {
        localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch { /* ignore */ }
}

/**
 * ActivityTracker — Tracks real active time on the website.
 * 
 * - Sends a heartbeat every 30 seconds while the user is active
 * - Pauses when the tab is hidden (not counting inactive time)
 * - Ends the session on tab close via sendBeacon
 * - Deduplicates sessions across multiple tabs using localStorage
 * - Tracks which pages the user visits during the session
 */
export function ActivityTracker() {
    const pathname = usePathname();
    const sessionIdRef = useRef<string | null>(null);
    const usernameRef = useRef<string | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isActiveRef = useRef(true);
    const startedRef = useRef(false);
    const failedRef = useRef(false);
    const isOwnerRef = useRef(false); // Whether THIS tab owns the session

    const sendHeartbeat = useCallback(async () => {
        if (!sessionIdRef.current || !isActiveRef.current || failedRef.current) return;
        try {
            const result = await heartbeat(sessionIdRef.current, window.location.pathname);
            if (result?.error === 'table_not_ready') {
                failedRef.current = true;
                return;
            }
            // Update localStorage timestamp so other tabs know we're alive
            if (isOwnerRef.current) {
                updateSessionHeartbeat();
            }
        } catch {
            // Network error — ignore, next heartbeat will retry
        }
    }, []);

    // Start session on mount
    useEffect(() => {
        if (startedRef.current || failedRef.current) return;
        startedRef.current = true;

        // Check if another tab already owns a session
        const existing = getExistingSession();
        if (existing) {
            // Piggyback on existing session — don't create a new one
            sessionIdRef.current = existing.sessionId;
            usernameRef.current = existing.username;
            isOwnerRef.current = false;
            // Still send heartbeats to update current_page
            intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
            return;
        }

        const sid = generateSessionId();
        sessionIdRef.current = sid;

        startActiveSession(sid, pathname).then(result => {
            if (result?.error === 'table_not_ready') {
                failedRef.current = true;
                return;
            }
            if (result?.username) {
                usernameRef.current = result.username;
            }
            isOwnerRef.current = true;
            claimSession(sid, usernameRef.current || '');

            // Start heartbeat interval
            intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
        });

        // Cleanup on unmount
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (sessionIdRef.current && !failedRef.current && isOwnerRef.current) {
                releaseSession();
                endActiveSession(sessionIdRef.current).catch(() => {});
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Track page changes within the session
    useEffect(() => {
        if (!sessionIdRef.current || failedRef.current) return;
        sendHeartbeat();
    }, [pathname, sendHeartbeat]);

    // Pause heartbeat when tab is hidden, resume when visible
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                isActiveRef.current = true;
                sendHeartbeat();
                if (!intervalRef.current && !failedRef.current) {
                    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
                }
            } else {
                isActiveRef.current = false;
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [sendHeartbeat]);

    // End session on tab close via sendBeacon (reliable during unload)
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (sessionIdRef.current && !failedRef.current && isOwnerRef.current) {
                releaseSession();
                // Use sendBeacon for reliable delivery during page unload
                const payload = JSON.stringify({
                    sessionId: sessionIdRef.current,
                    username: usernameRef.current || '',
                });
                try {
                    navigator.sendBeacon('/api/tracking/end', new Blob([payload], { type: 'application/json' }));
                } catch {
                    // Fallback: best-effort server action (may not complete)
                    endActiveSession(sessionIdRef.current).catch(() => {});
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    return null;
}
