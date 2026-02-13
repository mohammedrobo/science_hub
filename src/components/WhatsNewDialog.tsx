'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight } from 'lucide-react';
import { LATEST_VERSION } from '@/lib/data/changelog';
import { Button } from '@/components/ui/button';

export function WhatsNewDialog() {
    const router = useRouter();
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        if (hasChecked) return;

        // Check for "just_updated" flag set by ServiceWorkerRegistration
        const justUpdated = localStorage.getItem('just_updated');
        const lastSeenVersion = localStorage.getItem('last_seen_version');

        if (justUpdated === 'true' || (lastSeenVersion && lastSeenVersion !== LATEST_VERSION)) {
            // Immediate redirect to updates page
            localStorage.setItem('last_seen_version', LATEST_VERSION);
            localStorage.removeItem('just_updated');
            router.push('/updates');
        }

        setHasChecked(true);
    }, [hasChecked, router]);

    return null; // Logic only component
}
