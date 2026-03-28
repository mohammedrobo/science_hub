'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, X, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { searchUsersByName } from '../actions';

interface SearchResult {
    username: string;
    full_name: string;
    access_role: 'student' | 'leader' | 'admin' | 'super_admin' | 'doctor';
    original_section: string | null;
    original_group: string | null;
}

export function SearchStudentDialog() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const pathname = usePathname();
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Focus input when dialog opens
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setQuery('');
            setResults([]);
            setHasSearched(false);
        }
    }, [open]);

    const doSearch = useCallback(async (searchQuery: string) => {
        const trimmed = searchQuery.trim();
        if (trimmed.length < 2) {
            setResults([]);
            setHasSearched(false);
            return;
        }

        setIsSearching(true);
        try {
            const res = await searchUsersByName(trimmed);
            if (res.users) {
                setResults(res.users as SearchResult[]);
            }
            setHasSearched(true);
        } catch {
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const handleInputChange = useCallback((value: string) => {
        setQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(value), 300);
    }, [doSearch]);

    const handleSelectUser = useCallback((user: SearchResult) => {
        if (user.original_section) {
            const params = new URLSearchParams();
            params.set('section', user.original_section);
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }
        setOpen(false);
    }, [router, pathname]);

    const roleBadge = (role: string) => {
        switch (role) {
            case 'super_admin':
                return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50 text-[10px] px-1.5">Super Admin</Badge>;
            case 'admin':
                return <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-[10px] px-1.5">Admin</Badge>;
            case 'leader':
                return <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/50 text-[10px] px-1.5">Leader</Badge>;
            default:
                return <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-[10px] px-1.5">Student</Badge>;
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white gap-2"
                >
                    <Search className="w-4 h-4" />
                    <span className="hidden sm:inline">Search Student</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-zinc-100 flex items-center gap-2">
                        <Users className="w-5 h-5 text-violet-400" />
                        Search All Students
                    </DialogTitle>
                </DialogHeader>

                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => handleInputChange(e.target.value)}
                        placeholder="Type a student name..."
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-10 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                        autoComplete="off"
                    />
                    {query && (
                        <button
                            onClick={() => { setQuery(''); setResults([]); setHasSearched(false); inputRef.current?.focus(); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Loading */}
                {isSearching && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                    </div>
                )}

                {/* Results */}
                {!isSearching && results.length > 0 && (
                    <div className="max-h-80 overflow-y-auto space-y-1 custom-scrollbar">
                        <p className="text-xs text-zinc-500 px-1 mb-2">{results.length} result{results.length !== 1 ? 's' : ''} found</p>
                        {results.map((user) => (
                            <button
                                key={user.username}
                                onClick={() => handleSelectUser(user)}
                                className="w-full flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors text-left group"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white">
                                        {user.full_name}
                                    </p>
                                    <p className="text-xs text-zinc-500 truncate">
                                        @{user.username}
                                        {user.original_section && (
                                            <span className="ml-2 text-zinc-600">
                                                Section {user.original_section}
                                                {user.original_group && ` · Group ${user.original_group}`}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="ml-3 shrink-0">
                                    {roleBadge(user.access_role)}
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* No results */}
                {!isSearching && hasSearched && results.length === 0 && (
                    <div className="text-center py-8 text-zinc-500">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No students found for &quot;{query}&quot;</p>
                    </div>
                )}

                {/* Hint */}
                {!hasSearched && !isSearching && (
                    <p className="text-xs text-zinc-600 text-center py-4">
                        Search across all sections and groups. Type at least 2 characters.
                    </p>
                )}
            </DialogContent>
        </Dialog>
    );
}
