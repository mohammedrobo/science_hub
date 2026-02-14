'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Flame, Monitor, Smartphone, MapPin, ArrowRight } from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts';
import { getStudentTimeStats } from '@/app/tracking/heartbeat';

interface TimeStatsProps {
    username: string;
}

interface TimeData {
    totalMinutesToday: number;
    totalMinutesWeek: number;
    totalMinutesMonth: number;
    avgMinutesPerDay: number;
    sessionCount: number;
    longestSession: number;
    dailyMinutes: { date: string; minutes: number }[];
    recentSessions: {
        startedAt: string;
        endedAt: string;
        durationMinutes: number;
        pagesVisited: number;
        currentPage: string;
        device: string;
        isActive: boolean;
    }[];
}

function formatMinutes(min: number): string {
    if (min < 1) return '0m';
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatPage(path: string): string {
    if (!path || path === '/') return 'Home';
    const segments = path.split('/').filter(Boolean);
    return segments.join(' › ');
}

export function StudentTimeStats({ username }: TimeStatsProps) {
    const [data, setData] = useState<TimeData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getStudentTimeStats(username).then(d => {
            setData(d as TimeData);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [username]);

    if (loading) {
        return (
            <Card className="bg-zinc-900/50 border-zinc-800 animate-pulse">
                <CardHeader><CardTitle className="text-sm text-zinc-500">Loading time stats...</CardTitle></CardHeader>
            </Card>
        );
    }

    if (!data) {
        return (
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="py-8 text-center text-zinc-500 text-sm">
                    No time tracking data available yet. Data will appear once the tracking table is set up.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Time Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-3 text-center">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Today</p>
                        <p className="text-lg font-bold text-emerald-400 mt-1">{formatMinutes(data.totalMinutesToday)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-3 text-center">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">This Week</p>
                        <p className="text-lg font-bold text-blue-400 mt-1">{formatMinutes(data.totalMinutesWeek)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-3 text-center">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">30 Days</p>
                        <p className="text-lg font-bold text-violet-400 mt-1">{formatMinutes(data.totalMinutesMonth)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-3 text-center">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg/Day</p>
                        <p className="text-lg font-bold text-amber-400 mt-1">{formatMinutes(data.avgMinutesPerDay)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-3 text-center">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Sessions</p>
                        <p className="text-lg font-bold text-zinc-300 mt-1">{data.sessionCount}</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-3 text-center">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Longest</p>
                        <p className="text-lg font-bold text-red-400 mt-1">{formatMinutes(data.longestSession)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Daily Time Chart */}
            {data.dailyMinutes.length > 0 && (
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-400" />
                            Daily Active Time (Last 30 Days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200} minWidth={0} minHeight={0}>
                            <BarChart data={data.dailyMinutes}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: '#71717a' }}
                                    tickFormatter={v => {
                                        const d = new Date(v);
                                        return `${d.getDate()}/${d.getMonth() + 1}`;
                                    }}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#71717a' }}
                                    tickFormatter={v => `${v}m`}
                                />
                                <Tooltip
                                    contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                                    labelStyle={{ color: '#a1a1aa' }}
                                    formatter={(v: number | undefined) => [`${formatMinutes(v ?? 0)}`, 'Active Time']}
                                    labelFormatter={v => new Date(v).toLocaleDateString()}
                                />
                                <Bar dataKey="minutes" fill="#10b981" radius={[2, 2, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Recent Sessions */}
            {data.recentSessions.length > 0 && (
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-400" />
                            Recent Sessions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {data.recentSessions.map((s, i) => (
                            <div
                                key={i}
                                className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                                    s.isActive
                                        ? 'bg-emerald-500/5 border-emerald-500/20'
                                        : 'bg-zinc-900/30 border-zinc-800/50'
                                }`}
                            >
                                {/* Status */}
                                <div className="flex-shrink-0">
                                    {s.isActive ? (
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    ) : (
                                        <div className="w-2 h-2 bg-zinc-600 rounded-full" />
                                    )}
                                </div>

                                {/* Time range */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 text-xs">
                                        <span className="text-zinc-400">
                                            {new Date(s.startedAt).toLocaleString('en-GB', {
                                                day: '2-digit', month: 'short',
                                                hour: '2-digit', minute: '2-digit',
                                            })}
                                        </span>
                                        <ArrowRight className="w-3 h-3 text-zinc-600" />
                                        <span className="text-zinc-400">
                                            {s.isActive ? 'Now' : new Date(s.endedAt).toLocaleTimeString('en-GB', {
                                                hour: '2-digit', minute: '2-digit',
                                            })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-600">
                                        <span className="flex items-center gap-0.5">
                                            <MapPin className="w-2.5 h-2.5" />
                                            {formatPage(s.currentPage)}
                                        </span>
                                        <span>• {s.pagesVisited} pages</span>
                                    </div>
                                </div>

                                {/* Device */}
                                <div className="flex-shrink-0 text-zinc-600">
                                    {s.device === 'Mobile' ? (
                                        <Smartphone className="w-3.5 h-3.5" />
                                    ) : (
                                        <Monitor className="w-3.5 h-3.5" />
                                    )}
                                </div>

                                {/* Duration */}
                                <Badge
                                    variant="outline"
                                    className={`flex-shrink-0 text-[10px] ${
                                        s.isActive ? 'border-emerald-500/30 text-emerald-400' : 'border-zinc-700 text-zinc-500'
                                    }`}
                                >
                                    {formatMinutes(s.durationMinutes)}
                                </Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
