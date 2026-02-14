'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Shield, AlertTriangle, Activity } from 'lucide-react';

interface SafetyStatsProps {
    stats: {
        totalReports: number;
        openReports: number;
        totalLogs: number;
    };
    chartData: any[];
}

export function SafetyStats({ stats, chartData }: SafetyStatsProps) {
    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="flex items-center gap-4 p-4 sm:p-6 sm:block">
                        <div className="p-2.5 rounded-lg bg-red-500/10 sm:mb-2 shrink-0">
                            <AlertTriangle className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="flex-1 sm:flex-initial">
                            <p className="text-xs text-zinc-500 uppercase tracking-wide">Total Reports</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-white">{stats.totalReports}</span>
                                <span className="text-xs text-red-400">{stats.openReports} pending</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="flex items-center gap-4 p-4 sm:p-6 sm:block">
                        <div className="p-2.5 rounded-lg bg-blue-500/10 sm:mb-2 shrink-0">
                            <Activity className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="flex-1 sm:flex-initial">
                            <p className="text-xs text-zinc-500 uppercase tracking-wide">Total Activity</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-white">{stats.totalLogs}</span>
                                <span className="text-xs text-zinc-500">events</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="flex items-center gap-4 p-4 sm:p-6 sm:block">
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 sm:mb-2 shrink-0">
                            <Shield className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div className="flex-1 sm:flex-initial">
                            <p className="text-xs text-zinc-500 uppercase tracking-wide">System Health</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-emerald-400">Good</span>
                                <span className="text-xs text-zinc-500">operational</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2 sm:pb-4">
                    <CardTitle className="text-sm sm:text-base text-zinc-200">Activity Trends (Last 7 Days)</CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                    <div className="h-[200px] sm:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="date" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} width={30} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', fontSize: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Line type="monotone" dataKey="logs" stroke="#3b82f6" strokeWidth={2} dot={false} name="Activity" />
                                <Line type="monotone" dataKey="reports" stroke="#ef4444" strokeWidth={2} dot={false} name="Reports" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
