'use client';

import dynamic from 'next/dynamic';
import { LazyMotion, domAnimation } from 'framer-motion';

const FloatingDaVinci = dynamic(() => import('./FloatingDaVinci').then(mod => mod.FloatingDaVinci), {
    ssr: false
});

export function FloatingDaVinciWrapper() {
    return (
        <LazyMotion features={domAnimation} strict>
            <FloatingDaVinci />
        </LazyMotion>
    );
}
