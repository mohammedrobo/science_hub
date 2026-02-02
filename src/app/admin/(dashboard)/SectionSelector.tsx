'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SectionSelectorProps {
    sections: string[];
}

export function SectionSelector({ sections }: SectionSelectorProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentSection = searchParams.get('section') || '';

    const handleValueChange = (value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value) {
            params.set('section', value);
        } else {
            params.delete('section');
        }
        router.push(`/admin?${params.toString()}`);
    };

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
