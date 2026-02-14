'use client';

import { useState, useDeferredValue } from 'react';
import { Shield, LayoutDashboard, Users, Activity, Bell, FileText, Pin, ArrowLeft, Radio, Search, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { DashboardOverview } from './DashboardOverview';
import { StudentRankingTable } from './StudentRankingTable';
import { ActivityFeed } from './ActivityFeed';
import { AlertsPanel } from './AlertsPanel';
import { ReportsTable } from './ReportsTable';
import { WatchlistTable } from './WatchlistTable';
import { LiveTracker } from './LiveTracker';
import { SafetyErrorBoundary } from './SafetyErrorBoundary';
import type { ClassOverview, HeatmapCell, EngagementScore } from '@/lib/safety/analytics';

type Tab = 'dashboard' | 'live' | 'students' | 'activity' | 'alerts' | 'reports' | 'watchlist';

interface SafetyDashboardClientProps {
    dashboardData: {
        overview: ClassOverview;
        heatmap: HeatmapCell[];
        recentAlerts: any[];
        sections: string[];
        groups: string[];
    };
    initialStudents: EngagementScore[];
    initialLogs: any[];
    initialLogCount: number;
    initialReports: any[];
    initialAlerts: any[];
}

const TABS: { id: Tab; label: string; icon: React.ReactNode; mobileLabel: string }[] = [
    { id: 'dashboard', label: 'Dashboard', mobileLabel: 'Home', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'live', label: 'Live Now', mobileLabel: 'Live', icon: <Radio className="h-4 w-4" /> },
    { id: 'students', label: 'Students', mobileLabel: 'Students', icon: <Users className="h-4 w-4" /> },
    { id: 'activity', label: 'Activity Feed', mobileLabel: 'Activity', icon: <Activity className="h-4 w-4" /> },
    { id: 'alerts', label: 'Alerts', mobileLabel: 'Alerts', icon: <Bell className="h-4 w-4" /> },
    { id: 'reports', label: 'Reports', mobileLabel: 'Reports', icon: <FileText className="h-4 w-4" /> },
    { id: 'watchlist', label: 'Watchlist', mobileLabel: 'Pinned', icon: <Pin className="h-4 w-4" /> },
];

export function SafetyDashboardClient({
    dashboardData,
    initialStudents,
    initialLogs,
    initialLogCount,
    initialReports,
    initialAlerts,
}: SafetyDashboardClientProps) {
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [studentSearch, setStudentSearch] = useState('');
    const deferredSearch = useDeferredValue(studentSearch);

    const unacknowledgedAlerts = initialAlerts.filter(a => !a.is_acknowledged).length;

    // Quick search results from the full students list — deferred to avoid lag
    const searchResults = deferredSearch.length >= 2
        ? initialStudents.filter(s =>
            s.username.toLowerCase().includes(deferredSearch.toLowerCase()) ||
            s.fullName?.toLowerCase().includes(deferredSearch.toLowerCase())
        ).slice(0, 20)
        : [];

    return (
        <div className="min-h-screen bg-zinc-950">
            {/* Header */}
            <div className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-20">
                <div className="container mx-auto px-4 h-14 flex items-center gap-3">
                    <Link href="/admin">
                        <Button variant="ghost" size="icon" className="shrink-0 text-zinc-400 hover:text-white hover:bg-zinc-800/50">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2.5 shrink-0">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10">
                            <Shield className="h-4 w-4 text-emerald-400" />
                        </div>
                        <h1 className="text-base font-bold text-white tracking-tight hidden sm:block">Student Safety</h1>
                        <h1 className="text-base font-bold text-white tracking-tight sm:hidden">Safety</h1>
                    </div>

                    {/* Quick Student Search */}
                    <div className="relative flex-1 max-w-sm ml-auto">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                        <Input
                            placeholder="Search any student..."
                            className="pl-8 pr-8 h-9 bg-zinc-900 border-zinc-800 text-sm focus:border-emerald-500/50 focus:ring-emerald-500/20"
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                        />
                        {studentSearch && (
                            <button
                                onClick={() => setStudentSearch('')}
                                className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                        {searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl z-50 overflow-hidden">
                                <div className="px-3 py-1.5 border-b border-zinc-800 flex items-center justify-between">
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Results</span>
                                    <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-[10px] h-4 px-1.5">{searchResults.length}</Badge>
                                </div>
                                <div className="max-h-[320px] overflow-y-auto">
                                    {searchResults.map(s => (
                                        <Link
                                            key={s.username}
                                            href={`/admin/safety/student/${s.username}`}
                                            className="flex items-center justify-between px-3 py-2.5 hover:bg-zinc-800/70 transition-colors border-b border-zinc-800/50 last:border-0"
                                            onClick={() => setStudentSearch('')}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-medium text-zinc-200 truncate">{s.fullName || s.username}</div>
                                                <div className="text-xs text-zinc-500 truncate">@{s.username}{s.section ? ` · ${s.section}` : ''}{s.group ? ` · G${s.group}` : ''}</div>
                                            </div>
                                            <div className="flex items-center gap-2 ml-3 shrink-0">
                                                <div className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                                                    s.score >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                                                    s.score >= 60 ? 'bg-blue-500/10 text-blue-400' :
                                                    s.score >= 40 ? 'bg-yellow-500/10 text-yellow-400' :
                                                    s.score >= 20 ? 'bg-orange-500/10 text-orange-400' :
                                                    'bg-red-500/10 text-red-400'
                                                }`}>{s.score}</div>
                                                <ExternalLink className="w-3.5 h-3.5 text-zinc-600" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                        {studentSearch.length >= 2 && searchResults.length === 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl z-50 px-3 py-4 text-center">
                                <p className="text-sm text-zinc-500">No students found</p>
                            </div>
                        )}
                    </div>

                    <div className="hidden md:flex items-center gap-2 text-xs shrink-0">
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
                            <Users className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-zinc-300 font-semibold tabular-nums">{dashboardData.overview.totalStudents}</span>
                            <span className="text-zinc-600">students</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
                            <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative h-2 w-2 rounded-full bg-emerald-500"></span></span>
                            <span className="text-emerald-400 font-semibold tabular-nums">{dashboardData.overview.activeToday}</span>
                            <span className="text-zinc-600">online</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex">
                {/* Desktop Sidebar */}
                <aside className="hidden lg:flex flex-col w-52 min-h-[calc(100vh-56px)] border-r border-zinc-800/80 bg-zinc-950 p-2.5 gap-1 sticky top-14 self-start">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${
                                activeTab === tab.id
                                    ? 'bg-emerald-500/10 text-emerald-300 font-semibold shadow-sm shadow-emerald-500/5'
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80'
                            }`}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                            {tab.id === 'alerts' && unacknowledgedAlerts > 0 && (
                                <Badge className="ml-auto bg-red-600 text-white text-[9px] px-1.5 h-4">
                                    {unacknowledgedAlerts}
                                </Badge>
                            )}
                        </button>
                    ))}
                </aside>

                {/* Mobile Bottom Nav */}
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/80 safe-area-inset-bottom">
                    <div className="flex justify-around">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex flex-col items-center gap-0.5 py-2.5 px-2 text-[10px] transition-colors relative ${
                                    activeTab === tab.id ? 'text-emerald-400' : 'text-zinc-500'
                                }`}
                            >
                                {activeTab === tab.id && (
                                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-400 rounded-full" />
                                )}
                                {tab.icon}
                                <span>{tab.mobileLabel}</span>
                                {tab.id === 'alerts' && unacknowledgedAlerts > 0 && (
                                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                                )}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Main Content */}
                <main className="flex-1 p-4 sm:p-6 pb-20 lg:pb-6 max-w-full overflow-hidden">
                    {activeTab === 'dashboard' && (
                        <SafetyErrorBoundary fallbackTitle="Dashboard failed to load">
                            <DashboardOverview
                                overview={dashboardData.overview}
                                heatmap={dashboardData.heatmap}
                                recentAlerts={dashboardData.recentAlerts}
                                students={initialStudents}
                            />
                        </SafetyErrorBoundary>
                    )}

                    {activeTab === 'live' && (
                        <SafetyErrorBoundary fallbackTitle="Live tracker failed to load">
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                        </span>
                                        Live Activity
                                    </h2>
                                    <p className="text-xs text-zinc-500 mt-1">Students currently online — auto-refreshes every 30 seconds</p>
                                </div>
                                <LiveTracker />
                            </div>
                        </SafetyErrorBoundary>
                    )}

                    {activeTab === 'students' && (
                        <SafetyErrorBoundary fallbackTitle="Student tracking failed to load">
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Student Tracking</h2>
                                    <p className="text-xs text-zinc-500 mt-1">Monitor individual students, filter by section or group</p>
                                </div>
                                <StudentRankingTable
                                    students={initialStudents}
                                    sections={dashboardData.sections}
                                    groups={dashboardData.groups}
                                />
                            </div>
                        </SafetyErrorBoundary>
                    )}

                    {activeTab === 'activity' && (
                        <SafetyErrorBoundary fallbackTitle="Activity feed failed to load">
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Activity Feed</h2>
                                    <p className="text-xs text-zinc-500 mt-1">Real-time student activity across the platform</p>
                                </div>
                                <ActivityFeed
                                    initialLogs={initialLogs}
                                    initialCount={initialLogCount}
                                    sections={dashboardData.sections}
                                />
                            </div>
                        </SafetyErrorBoundary>
                    )}

                    {activeTab === 'alerts' && (
                        <SafetyErrorBoundary fallbackTitle="Alerts failed to load">
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Smart Alerts</h2>
                                    <p className="text-xs text-zinc-500 mt-1">Auto-generated alerts for student behavior anomalies</p>
                                </div>
                                <AlertsPanel initialAlerts={initialAlerts} />
                            </div>
                        </SafetyErrorBoundary>
                    )}

                    {activeTab === 'reports' && (
                        <SafetyErrorBoundary fallbackTitle="Reports failed to load">
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Student Reports</h2>
                                    <p className="text-xs text-zinc-500 mt-1">Reports submitted by students</p>
                                </div>
                                <ReportsTable initialReports={initialReports} />
                            </div>
                        </SafetyErrorBoundary>
                    )}

                    {activeTab === 'watchlist' && (
                        <SafetyErrorBoundary fallbackTitle="Watchlist failed to load">
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Watchlist</h2>
                                    <p className="text-xs text-zinc-500 mt-1">Students you&apos;re monitoring closely</p>
                                </div>
                                <WatchlistTable />
                            </div>
                        </SafetyErrorBoundary>
                    )}
                </main>
            </div>
        </div>
    );
}
