'use client';

import { LazyMotion, domAnimation, m } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <LazyMotion features={domAnimation}>
            <m.div
                className="flex-1 w-full"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                    duration: 0.35, 
                    ease: [0.25, 0.1, 0.25, 1.0] // cubic-bezier for smooth feel
                }}
            >
                {children}
            </m.div>
        </LazyMotion>
    );
}

