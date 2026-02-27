'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SessionKickedModal } from './SessionKickedModal';
import { examModeValue } from '@/lib/exam-mode';

interface SessionGuardProps {
    children: React.ReactNode;
    sessionToken?: string;
}

const CHECK_INTERVAL_MS = examModeValue(
    30 * 60 * 1000,
    60 * 60 * 1000
); // 30m normal, 60m exam mode
const MIN_CHECK_GAP_MS = examModeValue(
    10 * 60 * 1000,
    20 * 60 * 1000
); // 10m normal, 20m exam mode burst throttle

/**
 * SessionGuard - Monitors session validity and handles kicks
 * 
 * Polls the server periodically to check if session is still valid.
 * If session is invalidated (kicked by another device), shows modal and redirects.
 */
export function SessionGuard({ children, sessionToken }: SessionGuardProps) {
    const [isKicked, setIsKicked] = useState(false);
    const [deviceInfo, setDeviceInfo] = useState<string | undefined>();
    const router = useRouter();
    const lastCheckRef = useRef(0);
    const isCheckingRef = useRef(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Check session validity
    const checkSession = useCallback(async (force = false) => {
        if (!sessionToken) return;
        const now = Date.now();
        if (!force && (now - lastCheckRef.current) < MIN_CHECK_GAP_MS) return;
        if (isCheckingRef.current) return;
        isCheckingRef.current = true;
        
        try {
            const response = await fetch('/api/auth/check-session', {
                method: 'POST',
                cache: 'no-store',
            });

            if (response.status === 429) {
                // Non-fatal throttling, keep user signed in and retry on next interval/focus.
                return;
            }

            const data = await response.json();

            if (!data.valid && data.reason !== 'rate_limited' && data.reason !== 'error') {
                setIsKicked(true);
                setDeviceInfo(data.newDeviceInfo);
            }
        } catch {
            // Network error - don't kick user, might just be offline
        } finally {
            lastCheckRef.current = Date.now();
            isCheckingRef.current = false;
        }
    }, [sessionToken]);

    useEffect(() => {
        if (!sessionToken) return;

        const startInterval = () => {
            if (intervalRef.current) return;
            intervalRef.current = setInterval(() => {
                checkSession();
            }, CHECK_INTERVAL_MS);
        };

        const stopInterval = () => {
            if (!intervalRef.current) return;
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        };

        // Check immediately on mount
        checkSession(true);

        // Poll only while tab is visible
        if (document.visibilityState === 'visible') {
            startInterval();
        }

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                startInterval();
                checkSession();
                return;
            }
            stopInterval();
        };
        const handleFocus = () => checkSession();

        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('focus', handleFocus);

        return () => {
            stopInterval();
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('focus', handleFocus);
        };
    }, [sessionToken, checkSession]);

    // Handle close - redirect to login
    const handleClose = () => {
        setIsKicked(false);
        router.push('/login');
    };

    return (
        <>
            {children}
            <SessionKickedModal 
                isOpen={isKicked} 
                onClose={handleClose}
                deviceInfo={deviceInfo}
            />
        </>
    );
}
