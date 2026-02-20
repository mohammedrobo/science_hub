'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

const INSTALL_DISMISSED_KEY = 'installPromptDismissedAt';
const INSTALL_INSTALLED_KEY = 'appInstalled';
const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

function isMobileOrTablet(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    // Check for mobile/tablet user agents
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i;
    if (mobileRegex.test(ua)) return true;
    // iPad with desktop UA (iPadOS 13+) — check touch + screen size
    if (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)) return true;
    return false;
}

function isIOSDevice(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    // iPadOS 13+ reports as Macintosh
    if (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)) return true;
    return false;
}

function isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
}

export function InstallPrompt() {
    const t = useTranslations('install');
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    const shouldShowPrompt = useCallback((): boolean => {
        // Already installed — never show
        if (isStandalone()) return false;
        if (localStorage.getItem(INSTALL_INSTALLED_KEY) === 'true') return false;

        // NOT mobile/tablet — never show
        if (!isMobileOrTablet()) return false;

        // Check 5-hour cooldown
        const lastDismissed = localStorage.getItem(INSTALL_DISMISSED_KEY);
        if (lastDismissed) {
            const elapsed = Date.now() - parseInt(lastDismissed, 10);
            if (elapsed < FIVE_HOURS_MS) return false;
        }

        return true;
    }, []);

    useEffect(() => {
        // Already installed as PWA — mark and bail
        if (isStandalone()) {
            localStorage.setItem(INSTALL_INSTALLED_KEY, 'true');
            return;
        }

        // Not mobile/tablet — bail
        if (!isMobileOrTablet()) return;

        const ios = isIOSDevice();
        setIsIOS(ios);

        if (ios) {
            // iOS doesn't fire beforeinstallprompt — show manually after delay
            if (shouldShowPrompt()) {
                const timer = setTimeout(() => setIsVisible(true), 3000);
                return () => clearTimeout(timer);
            }
            return;
        }

        // Android / Chrome — listen for native prompt
        const handler = (e: any) => {
            e.preventDefault();
            if (!isMobileOrTablet()) return;
            setDeferredPrompt(e);
            if (shouldShowPrompt()) {
                setIsVisible(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Listen for successful install
        const onInstall = () => {
            localStorage.setItem(INSTALL_INSTALLED_KEY, 'true');
            setIsVisible(false);
            setDeferredPrompt(null);
        };
        window.addEventListener('appinstalled', onInstall);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('appinstalled', onInstall);
        };
    }, [shouldShowPrompt]);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            localStorage.setItem(INSTALL_INSTALLED_KEY, 'true');
            setDeferredPrompt(null);
            setIsVisible(false);
            toast.success(t('installing'));
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem(INSTALL_DISMISSED_KEY, Date.now().toString());
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 start-4 end-4 z-[51] animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 shadow-xl flex flex-col gap-3 max-w-md mx-auto">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <Download className="w-4 h-4 text-primary" />
                            {t('title')}
                        </h3>
                        <p className="text-sm text-zinc-400 mt-1">
                            {isIOS ? t('descriptionIOS') : t('descriptionAndroid')}
                        </p>
                    </div>
                    <button onClick={handleDismiss} className="text-zinc-500 hover:text-white flex-shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {isIOS ? (
                    <div className="text-xs text-zinc-500 bg-zinc-950/50 p-3 rounded border border-zinc-800/50">
                        <p>{t('iosStep1')} <span className="inline-block px-1 bg-zinc-800 rounded">⎋</span></p>
                        <p className="mt-1">{t('iosStep2')} <span className="inline-block px-1 bg-zinc-800 rounded">⊕</span></p>
                    </div>
                ) : (
                    <Button onClick={handleInstall} className="w-full bg-primary hover:bg-primary/90 text-white">
                        {t('installNow')}
                    </Button>
                )}
            </div>
        </div>
    );
}
