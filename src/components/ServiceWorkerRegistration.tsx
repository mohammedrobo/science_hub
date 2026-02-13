'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, RefreshCw } from 'lucide-react';

export function ServiceWorkerRegistration() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
    const [showDialog, setShowDialog] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
            return;
        }

        const registerSW = async () => {
            try {
                const reg = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/',
                    updateViaCache: 'none'
                });

                setRegistration(reg);

                // Check for updates periodically
                const intervalId = setInterval(() => {
                    reg.update();
                }, 60 * 60 * 1000); // Every hour

                // Listen for new workers installing
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (!newWorker) return;

                    newWorker.addEventListener('statechange', () => {
                        // If we have a controller (meaning it's an update, not first install)
                        // AND the new worker is installed (waiting)
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {

                            // CHECK SNOOZE
                            const snoozeUntil = localStorage.getItem('update_snooze_until');
                            if (snoozeUntil && Date.now() < parseInt(snoozeUntil)) {
                                console.log('[SW] Update snoozed until', new Date(parseInt(snoozeUntil)));
                                return;
                            }

                            setUpdateAvailable(true);
                            setShowDialog(true);
                        }
                    });
                });

                // Force reload when the new worker takes over
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    window.location.reload();
                });

                return () => clearInterval(intervalId);

            } catch (error) {
                console.warn('[SW] Registration failed:', error);
            }
        };

        registerSW();
        // Dependency array should be empty to run once on mount
    }, []);

    const handleUpdate = () => {
        if (!registration || !registration.waiting) {
            window.location.reload(); // Fallback
            return;
        }
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        // The controllerchange event will trigger the reload
    };

    return (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent
                className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100"
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-violet-400">
                        <Download className="w-6 h-6" />
                        Update Available
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400 pt-2">
                        A new version of Science Hub is ready to install! This update includes new features and performance improvements.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center gap-4 py-4 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                    <div className="bg-violet-500/20 p-3 rounded-full">
                        <RefreshCw className="w-6 h-6 text-violet-400 animate-spin-slow" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-white">V17.0 Ready</h4>
                        <p className="text-xs text-zinc-500">Downloads in background</p>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => setShowDialog(false)} className="text-zinc-400 hover:text-white">
                        Update Later
                    </Button>
                    <Button onClick={handleUpdate} className="bg-violet-600 hover:bg-violet-500 text-white gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Update Now
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
