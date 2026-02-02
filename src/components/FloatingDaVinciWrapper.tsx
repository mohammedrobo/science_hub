'use client';

import dynamic from 'next/dynamic';

const FloatingDaVinci = dynamic(() => import('./FloatingDaVinci').then(mod => mod.FloatingDaVinci), {
    ssr: false
});

export function FloatingDaVinciWrapper() {
    return <FloatingDaVinci />;
}
