'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SessionKickedModal } from './SessionKickedModal';

interface SessionGuardProps {
    children: React.ReactNode;
    sessionToken?: string;
}

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

    // Check session validity
    const checkSession = useCallback(async () => {
        if (!sessionToken) return;
        
        try {
            const response = await fetch('/api/auth/check-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: sessionToken })
            });
            
            const data = await response.json();
            
            if (!data.valid) {
                setIsKicked(true);
                setDeviceInfo(data.newDeviceInfo);
            }
        } catch {
            // Network error - don't kick user, might just be offline
        }
    }, [sessionToken]);

    // Poll every 30 seconds
    useEffect(() => {
        if (!sessionToken) return;

        // Check immediately
        checkSession();

        // Then poll every 30 seconds
        const interval = setInterval(checkSession, 30000);

        // Also check when window regains focus (user switches back to tab)
        const handleFocus = () => checkSession();
        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(interval);
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
