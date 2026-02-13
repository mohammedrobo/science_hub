'use client';

import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PinOff, Eye, Loader2 } from 'lucide-react';
import { getMyWatchlist, toggleWatchlist } from '../actions';
import { toast } from 'sonner';
import { StudentProfileSheet } from './StudentProfileSheet';

export function WatchlistTable() {
    const [watchlist, setWatchlist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const fetchWatchlist = async () => {
        setLoading(true);
        const data = await getMyWatchlist();
        setWatchlist(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchWatchlist();
    }, []);

    const handleUnpin = async (username: string) => {
        const res = await toggleWatchlist(username);
        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success('Removed from watchlist');
            setWatchlist(watchlist.filter(w => w.student_username !== username));
        }
    };

    return (
        <div className="space-y-4">
            <div className="rounded-md border border-zinc-800 bg-zinc-950">
                <Table>
                    <TableHeader>
                        <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                            <TableHead className="text-zinc-400">Student</TableHead>
                            <TableHead className="text-zinc-400 hidden md:table-cell">Added On</TableHead>
                            <TableHead className="text-zinc-400 hidden sm:table-cell">Reason</TableHead>
                            <TableHead className="text-right text-zinc-400">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-zinc-500" />
                                </TableCell>
                            </TableRow>
                        ) : watchlist.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-zinc-500">
                                    No students in watchlist.
                                </TableCell>
                            </TableRow>
                        ) : (
                            watchlist.map((item) => (
                                <TableRow key={item.id} className="border-zinc-800 hover:bg-zinc-900/50">
                                    <TableCell className="font-medium text-zinc-200">
                                        <button
                                            onClick={() => { setSelectedUser(item.student_username); setIsProfileOpen(true); }}
                                            className="hover:underline flex items-center gap-2"
                                        >
                                            {item.student_username}
                                        </button>
                                    </TableCell>
                                    <TableCell className="text-zinc-500 text-xs hidden md:table-cell">
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-zinc-400 text-sm hidden sm:table-cell">
                                        {item.reason || <span className="text-zinc-600 italic">No reason provided</span>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => { setSelectedUser(item.student_username); setIsProfileOpen(true); }}
                                                className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleUnpin(item.student_username)}
                                                className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-950/20"
                                            >
                                                <PinOff className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <StudentProfileSheet
                username={selectedUser}
                open={isProfileOpen}
                onOpenChange={(open) => {
                    setIsProfileOpen(open);
                    if (!open) fetchWatchlist(); // Refresh list on close in case status changed in sheet
                }}
            />
        </div>
    );
}
