'use client';

import { useSemesterStore } from '@/stores/semester-store';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

export function SemesterToggle() {
    const { semester, setSemester, hasHydrated } = useSemesterStore();
    const router = useRouter();
    const pathname = usePathname();
    const t = useTranslations('nav');

    const handleToggle = (newSemester: 1 | 2) => {
        setSemester(newSemester);
        if (pathname !== '/') {
            router.push('/');
        }
    };

    if (!hasHydrated) {
        return <div className="w-[116px] sm:w-[190px] h-[36px] bg-muted rounded-full animate-pulse" />;
    }

    const tabs = [
        { id: 1 as const, label: t('term1') },
        { id: 2 as const, label: t('term2') },
    ];

    return (
        <div className="relative flex items-center bg-muted p-1 rounded-full border border-border">
            {/* Sliding background pill — uses logical start for RTL support */}
            <div
                className={cn(
                    "absolute top-1 bottom-1 w-[52px] sm:w-24 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full shadow-lg shadow-violet-500/25 transition-all duration-300 ease-out",
                    semester === 1 ? "start-1" : "start-[calc(50%)]"
                )}
            />
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => handleToggle(tab.id)}
                    className={cn(
                        "relative px-3 sm:px-4 py-1.5 text-[11px] sm:text-sm font-medium w-[52px] sm:w-24 text-center rounded-full z-10 outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors duration-200",
                        semester === tab.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
