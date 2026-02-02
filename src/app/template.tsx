'use client';

/**
 * Page template wrapper.
 * Using CSS animation instead of Framer Motion for simpler page transitions.
 * Framer Motion page transitions require AnimatePresence at layout level
 * which causes hydration issues with server components.
 */
export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex-1 w-full animate-fade-in">
            {children}
        </div>
    );
}

