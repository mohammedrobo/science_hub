'use client';

import { useSemesterStore } from '@/stores/semester-store';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';

export function SemesterToggle() {
    const { semester, setSemester, hasHydrated } = useSemesterStore();
    const router = useRouter();
    const pathname = usePathname();

    const handleToggle = (newSemester: 1 | 2) => {
        setSemester(newSemester);
        if (pathname !== '/') {
            router.push('/');
        }
    };

    if (!hasHydrated) {
        return <div className="w-[140px] sm:w-[190px] h-[36px] bg-muted rounded-full animate-pulse" />;
    }

    const tabs = [
        { id: 1 as const, label: 'Term 1' },
        { id: 2 as const, label: 'Term 2' },
    ];

    return (
        <div className="relative flex items-center bg-muted p-1 rounded-full border border-border">
            {/* Sliding background pill */}
            <div 
                className={cn(
                    "absolute top-1 bottom-1 w-20 sm:w-24 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full shadow-lg shadow-violet-500/25 transition-all duration-300 ease-out",
                    semester === 1 ? "left-1" : "left-[calc(50%)]" 
                )}
            />
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => handleToggle(tab.id)}
                    className={cn(
                        "relative px-4 py-1.5 text-xs sm:text-sm font-medium w-20 sm:w-24 text-center rounded-full z-10 outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors duration-200",
                        semester === tab.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
