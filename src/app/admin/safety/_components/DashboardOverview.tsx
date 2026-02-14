'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, Activity, TrendingUp, AlertTriangle, Star, ShieldAlert, ArrowUpRight, Zap } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { ActivityHeatmap } from './ActivityHeatmap';
import { AlertsPanel } from './AlertsPanel';
import type { ClassOverview, HeatmapCell, EngagementScore } from '@/lib/safety/analytics';
import Link from 'next/link';

interface DashboardOverviewProps {
    overview: ClassOverview;
    heatmap: HeatmapCell[];
    recentAlerts: any[];
    students?: EngagementScore[];
}

const ENGAGEMENT_TIERS = [
    { name: 'Excellent', min: 80, color: '#22c55e' },
    { name: 'Good',      min: 60, color: '#3b82f6' },
    { name: 'Average',   min: 40, color: '#eab308' },
    { name: 'Low',       min: 20, color: '#f97316' },
    { name: 'Critical',  min: 0,  color: '#ef4444' },
];

function getTier(score: number) {
    return ENGAGEMENT_TIERS.find(t => score >= t.min) || ENGAGEMENT_TIERS[4];
}

function ScoreBar({ score }: { score: number }) {
    const tier = getTier(score);
    return (
        <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: tier.color }} />
            </div>
            <span className="text-xs font-mono tabular-nums w-6 text-right" style={{ color: tier.color }}>{score}</span>
        </div>
    );
}

function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
            <p className="text-xs font-medium text-zinc-300 mb-1">{label}</p>
            {payload.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-zinc-400">{p.name === 'avgScore' ? 'Avg Score' : p.name === 'studentCount' ? 'Students' : p.name}</span>
                    <span className="ml-auto font-mono text-zinc-200">{p.value}</span>
                </div>
            ))}
        </div>
    );
}

export function DashboardOverview({ overview, heatmap, recentAlerts, students = [] }: DashboardOverviewProps) {
    // Compute engagement distribution
    const distribution = ENGAGEMENT_TIERS.map(tier => ({
        ...tier,
        value: students.filter(s => getTier(s.score).name === tier.name).length,
    }));
    const activeDistribution = distribution.filter(d => d.value > 0);
    const participationRate = overview.totalStudents > 0 ? Math.round((overview.activeThisWeek / overview.totalStudents) * 100) : 0;
    const sectionColors = ['#8b5cf6', '#6366f1', '#a78bfa', '#7c3aed', '#818cf8'];
    const groupColors = ['#22c55e', '#10b981', '#34d399', '#059669', '#6ee7b7'];

    return (
        <div className="space-y-6">
            {/* ═══ Hero Metric Cards ═══ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border-zinc-800 overflow-hidden relative group hover:border-blue-500/30 transition-all duration-300">
                    <CardContent className="p-4 relative z-10">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Students</p>
                                <p className="text-3xl font-black text-white mt-1 tabular-nums">{overview.totalStudents}</p>
                                <p className="text-[11px] text-zinc-500 mt-1">{overview.activeThisWeek} active this week</p>
                            </div>
                            <div className="p-2 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                                <Users className="h-5 w-5 text-blue-400" />
                            </div>
                        </div>
                    </CardContent>
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-blue-500/[0.03] rounded-tl-full" />
                </Card>

                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border-zinc-800 overflow-hidden relative group hover:border-emerald-500/30 transition-all duration-300">
                    <CardContent className="p-4 relative z-10">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Online Now</p>
                                <p className="text-3xl font-black text-white mt-1 tabular-nums">{overview.activeToday}</p>
                                <div className="flex items-center gap-1 mt-1">
                                    <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" /></span>
                                    <span className="text-[11px] text-emerald-400/70">live</span>
                                </div>
                            </div>
                            <div className="p-2 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                                <UserCheck className="h-5 w-5 text-emerald-400" />
                            </div>
                        </div>
                    </CardContent>
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-emerald-500/[0.03] rounded-tl-full" />
                </Card>

                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border-zinc-800 overflow-hidden relative group hover:border-violet-500/30 transition-all duration-300">
                    <CardContent className="p-4 relative z-10">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Engagement</p>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <p className="text-3xl font-black text-white tabular-nums">{overview.avgEngagementScore}</p>
                                    <span className="text-sm text-zinc-600">/100</span>
                                </div>
                                <p className="text-[11px] text-zinc-500 mt-1">{participationRate}% participation</p>
                            </div>
                            <div className="p-2 rounded-xl bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
                                <TrendingUp className="h-5 w-5 text-violet-400" />
                            </div>
                        </div>
                    </CardContent>
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-violet-500/[0.03] rounded-tl-full" />
                </Card>

                <Card className={`bg-gradient-to-br from-zinc-900 to-zinc-900/50 border-zinc-800 overflow-hidden relative group transition-all duration-300 ${overview.atRiskStudents.length > 0 ? 'hover:border-red-500/30' : 'hover:border-zinc-700'}`}>
                    <CardContent className="p-4 relative z-10">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">At Risk</p>
                                <p className={`text-3xl font-black mt-1 tabular-nums ${overview.atRiskStudents.length > 0 ? 'text-red-400' : 'text-white'}`}>{overview.atRiskStudents.length}</p>
                                <p className="text-[11px] text-red-400/60 mt-1">{overview.atRiskStudents.length > 0 ? 'needs attention' : 'all clear ✓'}</p>
                            </div>
                            <div className={`p-2 rounded-xl ${overview.atRiskStudents.length > 0 ? 'bg-red-500/10 group-hover:bg-red-500/20' : 'bg-zinc-800 group-hover:bg-zinc-700'} transition-colors`}>
                                <AlertTriangle className={`h-5 w-5 ${overview.atRiskStudents.length > 0 ? 'text-red-400' : 'text-zinc-500'}`} />
                            </div>
                        </div>
                    </CardContent>
                    {overview.atRiskStudents.length > 0 && <div className="absolute bottom-0 right-0 w-24 h-24 bg-red-500/[0.03] rounded-tl-full" />}
                </Card>
            </div>

            {/* ═══ Engagement Distribution ═══ */}
            {students.length > 0 && (
                <Card className="bg-zinc-900/80 border-zinc-800 overflow-hidden">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-amber-400" />
                                <h3 className="text-sm font-semibold text-zinc-200">Engagement Distribution</h3>
                            </div>
                            <span className="text-[11px] text-zinc-500 tabular-nums">{students.length} students</span>
                        </div>
                        <div className="flex h-4 rounded-lg overflow-hidden gap-px mb-4 bg-zinc-800">
                            {activeDistribution.map(d => (
                                <div
                                    key={d.name}
                                    className="relative transition-all duration-700 first:rounded-l-lg last:rounded-r-lg group/bar"
                                    style={{ width: `${(d.value / students.length) * 100}%`, backgroundColor: d.color, minWidth: d.value > 0 ? '6px' : '0' }}
                                    title={`${d.name}: ${d.value} students (${Math.round((d.value / students.length) * 100)}%)`}
                                >
                                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/0 group-hover/bar:text-white/90 transition-colors">
                                        {(d.value / students.length) * 100 >= 8 ? d.value : ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-x-5 gap-y-2">
                            {distribution.map(d => (
                                <div key={d.name} className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 rounded" style={{ backgroundColor: d.color, opacity: d.value > 0 ? 1 : 0.3 }} />
                                    <span className={d.value > 0 ? 'text-zinc-300' : 'text-zinc-600'}>{d.name}</span>
                                    <span className="font-mono tabular-nums text-zinc-500">{d.value}</span>
                                    <span className="text-zinc-700">({Math.round((d.value / Math.max(students.length, 1)) * 100)}%)</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ═══ Charts Row ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-zinc-900/80 border-zinc-800">
                    <CardHeader className="pb-1 pt-4 px-5">
                        <CardTitle className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                            <div className="w-1 h-4 rounded-full bg-violet-500" />
                            By Section
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-4">
                        <div className="h-[220px] w-full">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <BarChart data={overview.sectionBreakdown} barGap={2}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
                                    <XAxis dataKey="section" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} width={28} />
                                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                                    <Bar dataKey="avgScore" name="avgScore" radius={[6, 6, 0, 0]} barSize={20}>
                                        {overview.sectionBreakdown.map((_: any, i: number) => (
                                            <Cell key={i} fill={sectionColors[i % sectionColors.length]} />
                                        ))}
                                    </Bar>
                                    <Bar dataKey="studentCount" name="studentCount" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={20} opacity={0.4} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/80 border-zinc-800">
                    <CardHeader className="pb-1 pt-4 px-5">
                        <CardTitle className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                            <div className="w-1 h-4 rounded-full bg-emerald-500" />
                            By Group
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-4">
                        <div className="h-[220px] w-full">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <BarChart data={overview.groupBreakdown} barGap={2}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
                                    <XAxis dataKey="group" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} width={28} />
                                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                                    <Bar dataKey="avgScore" name="avgScore" radius={[6, 6, 0, 0]} barSize={20}>
                                        {overview.groupBreakdown.map((_: any, i: number) => (
                                            <Cell key={i} fill={groupColors[i % groupColors.length]} />
                                        ))}
                                    </Bar>
                                    <Bar dataKey="studentCount" name="studentCount" fill="#06b6d4" radius={[6, 6, 0, 0]} barSize={20} opacity={0.4} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ═══ Heatmap ═══ */}
            <Card className="bg-zinc-900/80 border-zinc-800">
                <CardContent className="p-5">
                    <ActivityHeatmap data={heatmap} title="Class Activity Heatmap — Last 30 Days" />
                </CardContent>
            </Card>

            {/* ═══ Bottom Row ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Top Performers */}
                <Card className="bg-zinc-900/80 border-zinc-800 overflow-hidden">
                    <CardHeader className="pb-2 pt-4 px-5">
                        <CardTitle className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                            <Star className="h-4 w-4 text-amber-400" /> Top Performers
                            {overview.topPerformers.length > 0 && (
                                <Badge className="ml-auto bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] h-4 px-1.5">Top {overview.topPerformers.length}</Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                        {overview.topPerformers.length === 0 ? (
                            <p className="text-xs text-zinc-500 text-center py-6">No data yet</p>
                        ) : (
                            <div className="space-y-0.5">
                                {overview.topPerformers.map((s, i) => {
                                    const studentData = students.find(st => st.username === s.username);
                                    const displayName = studentData?.fullName || s.username;
                                    const medalColors = ['text-amber-400', 'text-zinc-300', 'text-orange-600'];
                                    return (
                                        <Link key={s.username} href={`/admin/safety/student/${s.username}`}
                                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/60 transition-colors group">
                                            <span className={`text-xs font-black w-5 text-center tabular-nums ${i < 3 ? medalColors[i] : 'text-zinc-600'}`}>{i + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm text-zinc-200 truncate block group-hover:text-white transition-colors">{displayName}</span>
                                                {studentData?.fullName && studentData.fullName !== s.username && (
                                                    <span className="text-[10px] text-zinc-600 truncate block">@{s.username}</span>
                                                )}
                                            </div>
                                            <ScoreBar score={s.score} />
                                            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* At-Risk Students */}
                <Card className={`bg-zinc-900/80 border-zinc-800 overflow-hidden ${overview.atRiskStudents.length > 0 ? 'border-l-2 border-l-red-500/30' : ''}`}>
                    <CardHeader className="pb-2 pt-4 px-5">
                        <CardTitle className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4 text-red-400" /> At Risk
                            {overview.atRiskStudents.length > 0 && (
                                <Badge className="ml-auto bg-red-500/10 text-red-400 border-red-500/20 text-[9px] h-4 px-1.5">{overview.atRiskStudents.length}</Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                        {overview.atRiskStudents.length === 0 ? (
                            <div className="text-center py-6">
                                <p className="text-sm text-emerald-400">All clear</p>
                                <p className="text-xs text-zinc-600 mt-1">No at-risk students 🎉</p>
                            </div>
                        ) : (
                            <div className="space-y-0.5">
                                {overview.atRiskStudents.slice(0, 6).map((s) => {
                                    const studentData = students.find(st => st.username === s.username);
                                    const displayName = studentData?.fullName || s.username;
                                    return (
                                        <Link key={s.username} href={`/admin/safety/student/${s.username}`}
                                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/5 transition-colors group">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm text-zinc-200 truncate block group-hover:text-white transition-colors">{displayName}</span>
                                                <span className="text-[10px] text-zinc-600 truncate block">{s.reason || 'Low engagement'}</span>
                                            </div>
                                            <ScoreBar score={s.score} />
                                            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-red-400 transition-colors shrink-0" />
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Alerts */}
                <Card className="bg-zinc-900/80 border-zinc-800 overflow-hidden">
                    <CardHeader className="pb-2 pt-4 px-5">
                        <CardTitle className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                            <Activity className="h-4 w-4 text-yellow-400" /> Recent Alerts
                            {recentAlerts.length > 0 && (
                                <Badge className="ml-auto bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[9px] h-4 px-1.5">{recentAlerts.filter((a: any) => !a.is_acknowledged).length} new</Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-2 pb-3">
                        <AlertsPanel initialAlerts={recentAlerts} compact />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
