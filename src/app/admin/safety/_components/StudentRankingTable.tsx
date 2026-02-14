'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, ArrowUpDown, Eye, ChevronDown } from 'lucide-react';
import { EngagementScoreGauge } from './EngagementScoreGauge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import type { EngagementScore } from '@/lib/safety/analytics';

interface StudentRankingTableProps {
    students: EngagementScore[];
    sections: string[];
    groups: string[];
    onFilterChange?: (filters: { section?: string; group?: string; username?: string }) => void;
}

export function StudentRankingTable({ students, sections, groups, onFilterChange }: StudentRankingTableProps) {
    const [search, setSearch] = useState('');
    const [selectedSection, setSelectedSection] = useState<string>('all');
    const [selectedGroup, setSelectedGroup] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'score' | 'name' | 'risk' | 'lastActive'>('score');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    // Client-side filtering from the data we have
    let filtered = students.filter(s => {
        if (search && !s.username.toLowerCase().includes(search.toLowerCase()) &&
            !s.fullName?.toLowerCase().includes(search.toLowerCase())) return false;
        if (selectedSection !== 'all' && s.section !== selectedSection) return false;
        if (selectedGroup !== 'all' && s.group !== selectedGroup) return false;
        return true;
    });

    // Sort
    filtered.sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        switch (sortBy) {
            case 'score': return (b.score - a.score) * dir;
            case 'name': return a.username.localeCompare(b.username) * dir;
            case 'risk': return (b.riskScore - a.riskScore) * dir;
            case 'lastActive': {
                const aT = a.lastActive ? new Date(a.lastActive).getTime() : 0;
                const bT = b.lastActive ? new Date(b.lastActive).getTime() : 0;
                return (bT - aT) * dir;
            }
            default: return 0;
        }
    });

    const toggleSort = (key: typeof sortBy) => {
        if (sortBy === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortDir('desc');
        }
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'excellent': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'good': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'average': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'low': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
            case 'critical': return 'bg-red-500/10 text-red-400 border-red-500/20';
            default: return 'bg-zinc-800 text-zinc-400';
        }
    };

    const formatTimeAgo = (dateStr: string | null) => {
        if (!dateStr) return 'Never';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return `${Math.floor(days / 7)}w ago`;
    };

    return (
        <div className="space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                        placeholder="Search student..."
                        className="pl-8 bg-zinc-900 border-zinc-800 h-9 text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="bg-zinc-900 border-zinc-800 h-9 text-xs">
                            Section: {selectedSection === 'all' ? 'All' : selectedSection}
                            <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
                        <DropdownMenuItem onClick={() => setSelectedSection('all')} className="text-zinc-300 cursor-pointer">All Sections</DropdownMenuItem>
                        {sections.map(s => (
                            <DropdownMenuItem key={s} onClick={() => setSelectedSection(s)} className="text-zinc-300 cursor-pointer">{s}</DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="bg-zinc-900 border-zinc-800 h-9 text-xs">
                            Group: {selectedGroup === 'all' ? 'All' : selectedGroup}
                            <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
                        <DropdownMenuItem onClick={() => setSelectedGroup('all')} className="text-zinc-300 cursor-pointer">All Groups</DropdownMenuItem>
                        {groups.map(g => (
                            <DropdownMenuItem key={g} onClick={() => setSelectedGroup(g)} className="text-zinc-300 cursor-pointer">{g}</DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Summary */}
            <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span>{filtered.length} students</span>
                <span>•</span>
                <span>Avg Score: {filtered.length > 0 ? Math.round(filtered.reduce((s, st) => s + st.score, 0) / filtered.length) : 0}</span>
            </div>

            {/* Student List */}
            <div className="space-y-2">
                {/* Sort Headers */}
                <div className="hidden sm:grid grid-cols-[1fr_80px_100px_80px_80px_40px] gap-3 px-4 text-[10px] text-zinc-500 uppercase tracking-wider">
                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors text-left">
                        Student <ArrowUpDown className="h-3 w-3" />
                    </button>
                    <button onClick={() => toggleSort('score')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                        Score <ArrowUpDown className="h-3 w-3" />
                    </button>
                    <span>Level</span>
                    <button onClick={() => toggleSort('lastActive')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                        Last Active <ArrowUpDown className="h-3 w-3" />
                    </button>
                    <button onClick={() => toggleSort('risk')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                        Risk <ArrowUpDown className="h-3 w-3" />
                    </button>
                    <span></span>
                </div>

                {filtered.map((student) => (
                    <div
                        key={student.username}
                        className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-3 sm:p-4 hover:border-zinc-700 transition-colors"
                    >
                        {/* Mobile layout */}
                        <div className="sm:hidden flex items-center gap-3">
                            <EngagementScoreGauge score={student.score} size="sm" showLabel={false} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-zinc-200 truncate">{student.username}</span>
                                    <Badge variant="outline" className={`text-[9px] px-1.5 h-4 ${getLevelColor(student.level)}`}>
                                        {student.level}
                                    </Badge>
                                </div>
                                <div className="text-[10px] text-zinc-500 mt-0.5">
                                    {student.fullName && <span>{student.fullName} • </span>}
                                    {student.section && <span>{student.section} • </span>}
                                    {formatTimeAgo(student.lastActive)}
                                </div>
                            </div>
                            <Link href={`/admin/safety/student/${student.username}`}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-white">
                                    <Eye className="h-4 w-4" />
                                </Button>
                            </Link>
                        </div>

                        {/* Desktop layout */}
                        <div className="hidden sm:grid grid-cols-[1fr_80px_100px_80px_80px_40px] gap-3 items-center">
                            <div className="min-w-0">
                                <span className="font-medium text-zinc-200 block truncate">{student.username}</span>
                                <span className="text-[10px] text-zinc-500 block truncate">
                                    {student.fullName}{student.section ? ` • ${student.section}` : ''}{student.group ? ` • Group ${student.group}` : ''}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${student.score}%`,
                                            backgroundColor: student.score >= 80 ? '#22c55e' : student.score >= 60 ? '#3b82f6' : student.score >= 40 ? '#eab308' : student.score >= 20 ? '#f97316' : '#ef4444'
                                        }}
                                    />
                                </div>
                                <span className="text-xs font-mono text-zinc-400 w-6 text-right">{student.score}</span>
                            </div>
                            <Badge variant="outline" className={`text-[10px] px-2 h-5 w-fit ${getLevelColor(student.level)}`}>
                                {student.level}
                            </Badge>
                            <span className="text-xs text-zinc-500">{formatTimeAgo(student.lastActive)}</span>
                            <span className={`text-xs font-mono ${student.riskScore > 30 ? 'text-red-400' : student.riskScore > 10 ? 'text-yellow-400' : 'text-zinc-500'}`}>
                                {student.riskScore}
                            </span>
                            <Link href={`/admin/safety/student/${student.username}`}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-white">
                                    <Eye className="h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                ))}

                {filtered.length === 0 && (
                    <div className="text-center py-12 text-zinc-500">
                        No students found matching your filters.
                    </div>
                )}
            </div>
        </div>
    );
}
