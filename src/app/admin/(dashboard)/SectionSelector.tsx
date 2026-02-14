'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, Suspense } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SectionSelectorProps {
    sections: string[];
    currentSection?: string;
}

function SectionSelectorInner({ sections, currentSection: propSection }: SectionSelectorProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentSection = propSection || searchParams.get('section') || '';

    const handleValueChange = useCallback((value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set('section', value);
        } else {
            params.delete('section');
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [router, pathname, searchParams]);

    return (
        <div className="w-[200px]">
            <Select value={currentSection} onValueChange={handleValueChange}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-200">
                    <SelectValue placeholder="Select Section" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700 max-h-[300px]">
                    {sections.map((section) => (
                        <SelectItem key={section} value={section} className="text-zinc-300 focus:bg-zinc-800 focus:text-white">
                            Section {section}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

export function SectionSelector({ sections, currentSection }: SectionSelectorProps) {
    return (
        <Suspense fallback={
            <div className="w-[200px]">
                <div className="h-9 bg-zinc-900 border border-zinc-700 rounded-md animate-pulse" />
            </div>
        }>
            <SectionSelectorInner sections={sections} currentSection={currentSection} />
        </Suspense>
    );
}
