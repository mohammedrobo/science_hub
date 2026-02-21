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
        return <div className="h-9 w-36 sm:w-48 bg-muted rounded-full animate-pulse" />;
    }

    const tabs = [
        { id: 1 as const, label: t('term1') },
        { id: 2 as const, label: t('term2') },
    ];

    return (
        <div className="flex bg-muted rounded-full p-1 border border-border gap-0.5">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => handleToggle(tab.id)}
                    className={cn(
                        "px-3.5 sm:px-5 py-1.5 text-xs sm:text-sm font-semibold rounded-full transition-all duration-200 whitespace-nowrap",
                        semester === tab.id
                            ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/30"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
