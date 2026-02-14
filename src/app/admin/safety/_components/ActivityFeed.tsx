'use client';

import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter, Eye, Loader2, ChevronDown, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getActivityLogs } from '../actions';
import Link from 'next/link';

interface ActivityFeedProps {
    initialLogs: any[];
    initialCount: number;
    sections: string[];
}

const ACTION_TYPES = ['LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'PAGE_VIEW', 'QUIZ_SUBMIT', 'LESSON_VIEW', 'PROFILE_UPDATE', 'REPORT_SUBMITTED', 'ADMIN_ACTION'];

export function ActivityFeed({ initialLogs, initialCount, sections }: ActivityFeedProps) {
    const [logs, setLogs] = useState(initialLogs);
    const [count, setCount] = useState(initialCount);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);

    // Filters
    const [search, setSearch] = useState('');
    const [filterUser, setFilterUser] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const fetchLogs = useCallback(async (pageNum = 1) => {
        setLoading(true);
        const res = await getActivityLogs(pageNum, 50, {
            search: search || undefined,
            username: filterUser || undefined,
            actionType: filterAction || undefined,
            section: filterSection || undefined,
        });
        setLogs(res.logs || []);
        setCount(res.count || 0);
        setPage(pageNum);
        setLoading(false);
    }, [search, filterUser, filterAction, filterSection]);

    const handleSearch = () => fetchLogs(1);

    const getActionColor = (type: string) => {
        if (type.includes('FAIL')) return 'bg-red-950/50 text-red-400';
        if (type === 'LOGIN') return 'bg-emerald-950/50 text-emerald-400';
        if (type === 'LOGOUT') return 'bg-zinc-800 text-zinc-400';
        if (type === 'QUIZ_SUBMIT') return 'bg-violet-950/50 text-violet-400';
        if (type === 'LESSON_VIEW') return 'bg-blue-950/50 text-blue-400';
        if (type === 'PAGE_VIEW') return 'bg-cyan-950/50 text-cyan-400';
        return 'bg-zinc-800 text-zinc-300';
    };

    const totalPages = Math.ceil(count / 50);

    return (
        <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                        placeholder="Search logs..."
                        className="pl-8 bg-zinc-900 border-zinc-800 h-9 text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="bg-zinc-900 border-zinc-800 h-9 text-xs">
                    <Filter className="h-3 w-3 mr-1" /> Filters
                </Button>
                <Button variant="outline" size="sm" onClick={() => fetchLogs(1)} disabled={loading} className="bg-zinc-900 border-zinc-800 h-9 text-xs">
                    <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
            </div>

            {/* Extended Filters */}
            {showFilters && (
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-3 flex flex-wrap gap-2">
                        <Input
                            placeholder="Filter by username..."
                            className="bg-zinc-900 border-zinc-800 h-8 text-xs flex-1 min-w-[150px]"
                            value={filterUser}
                            onChange={(e) => setFilterUser(e.target.value)}
                        />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="bg-zinc-900 border-zinc-800 h-8 text-xs">
                                    {filterAction || 'Action Type'} <ChevronDown className="ml-1 h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-zinc-900 border-zinc-800 max-h-60 overflow-y-auto">
                                <DropdownMenuItem onClick={() => setFilterAction('')} className="text-zinc-300 cursor-pointer text-xs">All Types</DropdownMenuItem>
                                {ACTION_TYPES.map(t => (
                                    <DropdownMenuItem key={t} onClick={() => setFilterAction(t)} className="text-zinc-300 cursor-pointer text-xs">{t}</DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="bg-zinc-900 border-zinc-800 h-8 text-xs">
                                    {filterSection || 'Section'} <ChevronDown className="ml-1 h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
                                <DropdownMenuItem onClick={() => setFilterSection('')} className="text-zinc-300 cursor-pointer text-xs">All Sections</DropdownMenuItem>
                                {sections.map(s => (
                                    <DropdownMenuItem key={s} onClick={() => setFilterSection(s)} className="text-zinc-300 cursor-pointer text-xs">{s}</DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button size="sm" onClick={() => fetchLogs(1)} className="h-8 text-xs bg-violet-600 hover:bg-violet-700">
                            Apply
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Log Entries */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                </div>
            ) : (
                <div className="space-y-1">
                    {logs.map((log, index) => {
                        const prevLog = index > 0 ? logs[index - 1] : null;
                        const isSameSession = prevLog &&
                            prevLog.username === log.username &&
                            prevLog.ip_address === log.ip_address &&
                            (new Date(prevLog.created_at).getTime() - new Date(log.created_at).getTime()) < 30 * 60 * 1000;

                        return (
                            <div
                                key={log.id}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-900/80 transition-colors group ${
                                    !isSameSession && index > 0 ? 'mt-3 border-t border-zinc-800/50 pt-3' : ''
                                }`}
                            >
                                {/* Timestamp */}
                                <span className="text-[10px] text-zinc-600 font-mono w-[52px] shrink-0 hidden sm:block">
                                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>

                                {/* Action Badge */}
                                <Badge variant="outline" className={`text-[10px] px-1.5 h-5 border-0 shrink-0 ${getActionColor(log.action_type)}`}>
                                    {log.action_type}
                                </Badge>

                                {/* Username */}
                                {!isSameSession ? (
                                    <Link
                                        href={`/admin/safety/student/${log.username}`}
                                        className="text-xs font-medium text-zinc-300 hover:text-white transition-colors min-w-[80px] truncate"
                                    >
                                        {log.username}
                                    </Link>
                                ) : (
                                    <span className="text-xs text-zinc-700 min-w-[80px]">↳</span>
                                )}

                                {/* Details preview */}
                                <span className="text-[10px] text-zinc-600 truncate flex-1 hidden md:block">
                                    {log.details?.path || (log.details ? JSON.stringify(log.details).slice(0, 60) : '')}
                                </span>

                                {/* IP */}
                                <span className="text-[10px] text-zinc-700 font-mono hidden lg:block">
                                    {!isSameSession ? log.ip_address : ''}
                                </span>

                                {/* Detail Dialog */}
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-white">
                                            <Eye className="h-3 w-3" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-md">
                                        <DialogHeader>
                                            <DialogTitle className="text-sm">Activity Detail</DialogTitle>
                                            <DialogDescription className="text-zinc-500 text-xs">
                                                {log.username} • {new Date(log.created_at).toLocaleString()}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="text-zinc-500">Action</div>
                                                <div className="text-zinc-200">{log.action_type}</div>
                                                <div className="text-zinc-500">IP Address</div>
                                                <div className="text-zinc-200 font-mono">{log.ip_address}</div>
                                                <div className="text-zinc-500">User Agent</div>
                                                <div className="text-zinc-200 truncate text-[10px]">{log.user_agent}</div>
                                            </div>
                                            <ScrollArea className="h-[150px] w-full rounded-md border border-zinc-800 p-3 bg-zinc-900/50">
                                                <pre className="text-[10px] font-mono text-zinc-300">
                                                    {JSON.stringify(log.details, null, 2)}
                                                </pre>
                                            </ScrollArea>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1 || loading}
                        onClick={() => fetchLogs(page - 1)}
                        className="bg-zinc-900 border-zinc-800 h-8 text-xs"
                    >
                        Previous
                    </Button>
                    <span className="text-xs text-zinc-500">
                        Page {page} of {totalPages} ({count} total)
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages || loading}
                        onClick={() => fetchLogs(page + 1)}
                        className="bg-zinc-900 border-zinc-800 h-8 text-xs"
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}
