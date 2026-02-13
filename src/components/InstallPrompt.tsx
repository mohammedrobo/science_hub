'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { toast } from 'sonner';

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return;
        }

        // Check for iOS
        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
        const isIosDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
        const isAndroid = /android/i.test(userAgent);
        const isMobile = isIosDevice || isAndroid;

        // If NOT mobile/tablet, do not show
        if (!isMobile) {
            return;
        }

        setIsIOS(isIosDevice);

        if (isIosDevice) {
            // Show iOS instructions after a delay, but check if we've shown it recently
            const lastShown = localStorage.getItem('installPromptShown');
            const now = Date.now();
            if (!lastShown || now - parseInt(lastShown) > 7 * 24 * 60 * 60 * 1000) {
                // Show once a week
                setTimeout(() => setIsVisible(true), 3000);
            }
        }

        const handler = (e: any) => {
            e.preventDefault();
            // Double check strict mobile if the event fires on desktop
            if (!isMobile) return;

            setDeferredPrompt(e);
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsVisible(false);
            toast.success('Installing app...');
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('installPromptShown', Date.now().toString());
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 shadow-xl flex flex-col gap-3">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <Download className="w-4 h-4 text-primary" />
                            Install App
                        </h3>
                        <p className="text-sm text-zinc-400 mt-1">
                            {isIOS
                                ? "Install this app on your iPhone for a better experience."
                                : "Add to your home screen for quick access and offline mode."}
                        </p>
                    </div>
                    <button onClick={handleDismiss} className="text-zinc-500 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {isIOS ? (
                    <div className="text-xs text-zinc-500 bg-zinc-950/50 p-3 rounded border border-zinc-800/50">
                        <p>1. Tap the Share button <span className="inline-block px-1 bg-zinc-800 rounded">⎋</span></p>
                        <p className="mt-1">2. Select "Add to Home Screen" <span className="inline-block px-1 bg-zinc-800 rounded">⊕</span></p>
                    </div>
                ) : (
                    <Button onClick={handleInstall} className="w-full bg-primary hover:bg-primary/90 text-white">
                        Install Now
                    </Button>
                )}
            </div>
        </div>
    );
}
