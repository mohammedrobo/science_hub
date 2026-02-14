'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, ShieldCheck, ShieldX, Search } from 'lucide-react';
import { resolveReport } from '../actions';
import { toast } from 'sonner';

interface ReportsTableProps {
    initialReports: any[];
}

import { StudentProfileSheet } from './StudentProfileSheet';

export function ReportsTable({ initialReports }: ReportsTableProps) {
    const [reports, setReports] = useState(initialReports);
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const handleResolve = async (id: string, status: 'resolved' | 'dismissed') => {
        const promise = resolveReport(id, status);
        toast.promise(promise, {
            loading: 'Updating report...',
            success: () => {
                setReports(reports.map(r => r.id === id ? { ...r, status } : r));
                return `Report marked as ${status}`;
            },
            error: 'Failed to update report'
        });
    };

    const filteredReports = reports.filter(r =>
        r.reason.toLowerCase().includes(search.toLowerCase()) ||
        r.reporter_username.toLowerCase().includes(search.toLowerCase()) ||
        r.reported_username.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                        placeholder="Search reports..."
                        className="pl-8 bg-zinc-900 border-zinc-800"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-md border border-zinc-800 bg-zinc-950 overflow-x-auto">
                <Table className="min-w-[500px] sm:min-w-0">
                    <TableHeader>
                        <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                            <TableHead className="text-zinc-400 hidden md:table-cell">Date</TableHead>
                            <TableHead className="text-zinc-400 w-[100px]">Status</TableHead>
                            <TableHead className="text-zinc-400 hidden sm:table-cell">Reporter</TableHead>
                            <TableHead className="text-zinc-400">Reported User</TableHead>
                            <TableHead className="text-zinc-400 hidden lg:table-cell">Reason</TableHead>
                            <TableHead className="text-right text-zinc-400">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredReports.map((report) => (
                            <TableRow key={report.id} className="border-zinc-800 hover:bg-zinc-900/50">
                                <TableCell className="text-zinc-400 text-xs hidden md:table-cell">
                                    {new Date(report.created_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`
                                        ${report.status === 'resolved' ? 'border-green-800 text-green-400' :
                                            report.status === 'dismissed' ? 'border-zinc-700 text-zinc-500' :
                                                'border-red-800 text-red-400 animate-pulse'}
                                    `}>
                                        {report.status || 'pending'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-zinc-300 hidden sm:table-cell">
                                    <button onClick={() => { setSelectedUser(report.reporter_username); setIsProfileOpen(true); }} className="hover:underline">
                                        {report.reporter_username}
                                    </button>
                                </TableCell>
                                <TableCell className="font-medium text-red-300">
                                    <button onClick={() => { setSelectedUser(report.reported_username); setIsProfileOpen(true); }} className="hover:underline">
                                        {report.reported_username}
                                    </button>
                                    <div className="sm:hidden text-xs text-zinc-500 mt-1">
                                        by {report.reporter_username}
                                    </div>
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate text-zinc-400 hidden lg:table-cell" title={report.details}>
                                    <span className="font-semibold text-zinc-200">{report.reason}</span>
                                    <span className="ml-2 text-xs opacity-70">- {report.details}</span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0 text-zinc-400 hover:text-white">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                                            {/* Mobile-only reason display in dropdown */}
                                            <div className="lg:hidden px-2 py-1.5 text-xs text-zinc-500 border-b border-zinc-800 mb-1">
                                                <span className="font-bold text-zinc-300">{report.reason}</span>
                                                <br />
                                                {report.details}
                                            </div>
                                            <DropdownMenuItem onClick={() => handleResolve(report.id, 'resolved')} className="text-emerald-400 focus:text-emerald-300 focus:bg-emerald-950/50 cursor-pointer">
                                                <ShieldCheck className="mr-2 h-4 w-4" /> Resolve Report
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleResolve(report.id, 'dismissed')} className="text-zinc-400 focus:text-zinc-300 focus:bg-zinc-800 cursor-pointer">
                                                <ShieldX className="mr-2 h-4 w-4" /> Dismiss
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <StudentProfileSheet
                username={selectedUser}
                open={isProfileOpen}
                onOpenChange={setIsProfileOpen}
            />
        </div>
    );
}
