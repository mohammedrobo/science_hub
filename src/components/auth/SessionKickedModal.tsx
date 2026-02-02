'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SessionKickedModalProps {
    isOpen: boolean;
    onClose: () => void;
    deviceInfo?: string;
}

export function SessionKickedModal({ isOpen, onClose, deviceInfo }: SessionKickedModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-red-500/30 rounded-2xl p-6 max-w-md mx-4 shadow-2xl shadow-red-500/10">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    
                    <h2 className="text-xl font-bold text-white">
                        Session Ended
                    </h2>
                    
                    <p className="text-zinc-400">
                        You've been logged out because your account was accessed from another device.
                    </p>

                    {deviceInfo && (
                        <div className="flex items-center justify-center gap-2 p-3 bg-zinc-800 rounded-lg">
                            <Smartphone className="w-4 h-4 text-zinc-500" />
                            <span className="text-sm text-zinc-400">{deviceInfo}</span>
                        </div>
                    )}

                    <div className="pt-2 space-y-2">
                        <p className="text-xs text-zinc-500">
                            For security, only one device can be logged in at a time.
                        </p>
                        <Button 
                            onClick={onClose}
                            className="w-full bg-red-600 hover:bg-red-500"
                        >
                            Sign In Again
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Hook to check if session was invalidated
 * Call this in layouts to detect when user is kicked
 */
export function useSessionValidation() {
    const [isKicked, setIsKicked] = useState(false);

    useEffect(() => {
        // Check URL params for kicked flag
        const params = new URLSearchParams(window.location.search);
        if (params.get('kicked') === 'true') {
            setIsKicked(true);
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    return { isKicked, clearKicked: () => setIsKicked(false) };
}
