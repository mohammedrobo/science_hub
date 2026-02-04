'use client';

import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';
import { usePathname } from 'next/navigation';

export function FeedbackButton() {
    const [isOpen, setIsOpen] = useState(false);

    const pathname = usePathname();

    // Hide on login page
    if (pathname === '/login') return null;

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-20 right-4 z-50 p-3 bg-violet-600 hover:bg-violet-700 text-white rounded-full shadow-lg shadow-violet-500/25 transition-all hover:scale-110 active:scale-95"
                title="Send Feedback"
            >
                <MessageSquarePlus className="w-5 h-5" />
            </button>

            {/* Modal */}
            <FeedbackModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </>
    );
}
