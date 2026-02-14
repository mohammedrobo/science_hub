'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useEffect, useState } from 'react';
import { getStudentProfile, toggleWatchlist, getWatchlistStatus } from '../actions';
import { Loader2, ShieldAlert, ShieldCheck, Shield, Clock, Calendar, AlertTriangle, Pin, ExternalLink } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { EngagementScoreGauge } from './EngagementScoreGauge';
import Link from 'next/link';

interface StudentProfileSheetProps {
    username: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function StudentProfileSheet({ username, open, onOpenChange }: StudentProfileSheetProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [isWatched, setIsWatched] = useState(false);
    const [watchLoading, setWatchLoading] = useState(false);

    useEffect(() => {
        if (open && username) {
            setLoading(true);
            Promise.all([
                getStudentProfile(username),
                getWatchlistStatus(username)
            ]).then(([profileRes, watchRes]) => {
                if (profileRes.profile) {
                    setData(profileRes);
                }
                setIsWatched(watchRes.watching);
                setLoading(false);
            });
        } else {
            setData(null);
            setIsWatched(false);
        }
    }, [open, username]);

    const handleToggleWatchlist = async () => {
        if (!username) return;
        setWatchLoading(true);
        try {
            const res = await toggleWatchlist(username);
            setIsWatched(res.watching);
            toast.success(res.watching ? 'Added to watchlist' : 'Removed from watchlist');
        } catch (error) {
            toast.error('Failed to update watchlist');
        } finally {
            setWatchLoading(false);
        }
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'High': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'Medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            default: return 'text-green-500 bg-green-500/10 border-green-500/20';
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:w-[540px] bg-zinc-950 border-zinc-800 text-zinc-100 overflow-y-auto">
                <SheetHeader className="mb-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <SheetTitle className="text-2xl font-bold flex items-center gap-3">
                                {username}
                                {data?.profile?.engagement && (
                                    <Badge variant="outline" className={getRiskColor(data.profile.engagement.riskScore > 30 ? 'High' : data.profile.engagement.riskScore > 15 ? 'Medium' : 'Low')}>
                                        {data.profile.engagement.riskScore > 30 ? 'High' : data.profile.engagement.riskScore > 15 ? 'Medium' : 'Low'} Risk
                                    </Badge>
                                )}
                            </SheetTitle>
                            <SheetDescription className="text-zinc-400 mt-1">
                                Student Safety Profile & Activity History
                            </SheetDescription>
                        </div>
                        {data && (
                            <div className="flex items-center gap-2">
                                <Link href={`/admin/safety/student/${username}`}>
                                    <Button variant="outline" size="sm" className="border-zinc-800 bg-transparent text-zinc-400 hover:text-white">
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Full Profile
                                    </Button>
                                </Link>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={watchLoading}
                                    onClick={handleToggleWatchlist}
                                    className={`
                                        border-zinc-800 
                                        ${isWatched ? 'bg-primary/20 text-primary border-primary/50' : 'bg-transparent text-zinc-400 hover:text-white'}
                                    `}
                                >
                                    <Pin className={`w-4 h-4 mr-2 ${isWatched ? 'fill-current' : ''}`} />
                                    {isWatched ? 'Pinned' : 'Pin Profile'}
                                </Button>
                            </div>
                        )}
                    </div>
                </SheetHeader>

                {loading ? (
                    <div className="flex h-[200px] items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                    </div>
                ) : data ? (
                    <div className="space-y-8">
                        {/* Engagement Score */}
                        {data.profile.engagement && (
                            <div className="flex items-center gap-4">
                                <EngagementScoreGauge score={data.profile.engagement.score} size="md" />
                                <div>
                                    <div className="text-sm text-zinc-400">Engagement Score</div>
                                    <div className="text-xl font-bold text-white">{data.profile.engagement.score}/100</div>
                                    <div className="text-xs text-zinc-500 mt-1">
                                        {data.profile.engagement.level} · Risk Score {data.profile.engagement.riskScore}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Key Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                                <div className="text-sm text-zinc-500 mb-1 flex items-center gap-2">
                                    <Shield className="w-4 h-4" /> Reports
                                </div>
                                <div className="text-2xl font-bold text-white">
                                    {data.reports?.length || 0}
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                                <div className="text-sm text-zinc-500 mb-1 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" /> XP / Rank
                                </div>
                                <div className="text-lg font-bold text-white">
                                    {data.profile.xp} · {data.profile.rank}
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                                <div className="text-sm text-zinc-500 mb-1 flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Last Login
                                </div>
                                <div className="text-sm font-medium text-white">
                                    {data.profile.last_login_at ? new Date(data.profile.last_login_at).toLocaleString() : 'N/A'}
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                                <div className="text-sm text-zinc-500 mb-1 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> Section · Group
                                </div>
                                <div className="text-sm font-medium text-white">
                                    {data.profile.original_section || '—'} · {data.profile.original_group || '—'}
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-zinc-800" />

                        {/* Recent Activity Timeline */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-zinc-400" /> Recent Activity
                            </h3>
                            <div className="relative border-l border-zinc-800 ml-2 space-y-6">
                                {data.recentActivity.map((log: any, i: number) => (
                                    <div key={log.id} className="ml-6 relative">
                                        <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 border-zinc-950 ${log.action_type === 'LOGIN' ? 'bg-green-500' :
                                            log.action_type.includes('FAIL') ? 'bg-red-500' :
                                                log.action_type === 'LOGOUT' ? 'bg-zinc-500' :
                                                    'bg-blue-500'
                                            }`} />

                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-zinc-200">
                                                {log.action_type.replace('_', ' ')}
                                            </span>
                                            <span className="text-xs text-zinc-500 mb-1">
                                                {new Date(log.created_at).toLocaleString()}
                                            </span>
                                            {log.details && Object.keys(log.details).length > 0 && (
                                                <div className="text-xs bg-zinc-900 p-2 rounded border border-zinc-800 text-zinc-400 mt-1 max-w-full sm:max-w-[300px] overflow-hidden truncate">
                                                    {log.details.path || JSON.stringify(log.details)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {data.recentActivity.length === 0 && (
                                    <p className="ml-6 text-zinc-500 italic">No recent activity recorded.</p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex h-[200px] items-center justify-center text-red-400">
                        Failed to load profile.
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
