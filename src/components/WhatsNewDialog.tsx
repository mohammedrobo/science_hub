'use client';

import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CHANGELOG, LATEST_VERSION } from '@/lib/data/changelog';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export function WhatsNewDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentEntry, setCurrentEntry] = useState(CHANGELOG[0]);

    useEffect(() => {
        const checkAndShowDialog = async () => {
            // 1. Check for active session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // 2. Check local storage for last seen version
            const lastSeenVersion = localStorage.getItem('lastSeenVersion');

            if (!lastSeenVersion || lastSeenVersion !== LATEST_VERSION) {
                // Show dialog if version changed
                // Wait a bit to not conflict with other popups
                const timer = setTimeout(() => {
                    setIsOpen(true);
                }, 1000);
                return () => clearTimeout(timer);
            }
        };

        checkAndShowDialog();

        // Optional: Listen for sign-in events to show it immediately after login
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                checkAndShowDialog();
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem('lastSeenVersion', LATEST_VERSION);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-primary">
                        <Sparkles className="w-5 h-5 text-yellow-400" />
                        What's New in {currentEntry.version}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        We've updated the app! Here's what changed on {currentEntry.date}:
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <h4 className="font-semibold text-white">{currentEntry.title}</h4>
                        <ul className="space-y-2">
                            {currentEntry.changes.map((change, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                    <span>{change}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button onClick={handleClose} className="bg-primary hover:bg-primary/90">
                        Got it!
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
