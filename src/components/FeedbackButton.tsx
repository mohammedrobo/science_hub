'use client';

import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

export function FeedbackButton() {
    const [isOpen, setIsOpen] = useState(false);
    const t = useTranslations('feedback');

    const pathname = usePathname();

    // Hide on login page
    if (pathname === '/login') return null;

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-20 end-4 z-50 p-3 bg-violet-600 hover:bg-violet-700 text-white rounded-full shadow-lg shadow-violet-500/25 transition-colors duration-75 active:scale-95"
                title={t('sendFeedbackButton')}
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
