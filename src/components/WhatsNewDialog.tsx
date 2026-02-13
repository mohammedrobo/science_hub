'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { LATEST_VERSION } from '@/lib/data/changelog';

export function WhatsNewDialog() {
    const router = useRouter();
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        if (hasChecked) return;

        const checkSessionAndRedirect = async () => {
            // 1. Check if user is logged in
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                return; // Do nothing if not logged in
            }

            // 2. Check flags
            const justUpdated = localStorage.getItem('just_updated');
            const lastSeenVersion = localStorage.getItem('last_seen_version');

            if (justUpdated === 'true' || (lastSeenVersion && lastSeenVersion !== LATEST_VERSION)) {
                localStorage.setItem('last_seen_version', LATEST_VERSION);
                localStorage.removeItem('just_updated');
                router.push('/updates');
            }
        };

        checkSessionAndRedirect();

        setHasChecked(true);
    }, [hasChecked, router]);

    return null; // Logic only component
}
