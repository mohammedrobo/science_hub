'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Monitor, Smartphone, Clock, MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import { getActiveSessions } from '@/app/tracking/heartbeat';

interface ActiveSession {
    session_id: string;
    username: string;
    full_name: string;
    section: string;
    group: string;
    started_at: string;
    last_heartbeat: string;
    current_page: string;
    device_info: any;
    active_minutes: number;
}

function formatDuration(minutes: number): string {
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatPage(path: string): string {
    if (!path || path === '/') return 'Home';
    const segments = path.split('/').filter(Boolean);
    const names: Record<string, string> = {
        'course': '📚 Course',
        'quiz': '📝 Quiz',
        'schedule': '📅 Schedule',
        'leaderboard': '🏆 Leaderboard',
        'profile': '👤 Profile',
        'guild': '⚔️ Guild',
        'tools': '🔧 Tools',
        'admin': '🔒 Admin',
        'login': '🔑 Login',
        'onboarding': '🎯 Onboarding',
        'updates': '📰 Updates',
        'leader': '👑 Leader',
        'change-password': '🔐 Change Password',
    };
    const first = segments[0];
    const base = names[first] || first;
    if (segments.length > 1) {
        return `${base} › ${segments.slice(1).join('/')}`;
    }
    return base;
}

export function LiveTracker() {
    const [sessions, setSessions] = useState<ActiveSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getActiveSessions();
            if ('error' in result && result.error === 'unauthorized') {
                console.warn('[LiveTracker] Unauthorized — cannot fetch sessions');
                setSessions([]);
            } else {
                setSessions((result.sessions || []) as ActiveSession[]);
            }
            setLastRefresh(new Date());
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
        // Auto-refresh every 30 seconds
        const interval = setInterval(refresh, 30000);
        return () => clearInterval(interval);
    }, [refresh]);

    // Group by section
    const bySectionMap = new Map<string, ActiveSession[]>();
    for (const s of sessions) {
        const sec = s.section || 'Unknown';
        if (!bySectionMap.has(sec)) bySectionMap.set(sec, []);
        bySectionMap.get(sec)!.push(s);
    }
    const bySection = [...bySectionMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    </div>
                    <div>
                        <span className="text-2xl font-bold text-white">{sessions.length}</span>
                        <span className="text-zinc-400 ml-2 text-sm">students online right now</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-600">
                        Updated {lastRefresh.toLocaleTimeString()}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={refresh}
                        disabled={loading}
                        className="text-zinc-400 hover:text-white h-8 w-8 p-0"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {sessions.length === 0 ? (
                <div className="text-center py-20 text-zinc-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">No students online</p>
                    <p className="text-sm mt-1">Active sessions will appear here in real-time</p>
                </div>
            ) : (
                <>
                    {/* Section Groups */}
                    {bySection.map(([section, sectionSessions]) => (
                        <div key={section} className="space-y-2">
                            <div className="flex items-center gap-2 px-1">
                                <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                                    {section}
                                </Badge>
                                <span className="text-xs text-zinc-600">{sectionSessions.length} online</span>
                            </div>
                            <div className="grid gap-2">
                                {sectionSessions.map(s => (
                                    <Link
                                        key={s.session_id}
                                        href={`/admin/safety/student/${s.username}`}
                                        className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg hover:bg-zinc-800/50 hover:border-zinc-700 transition-all group"
                                    >
                                        {/* Status indicator */}
                                        <div className="relative flex-shrink-0">
                                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                                        </div>

                                        {/* User info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-medium text-sm truncate">
                                                    {s.full_name}
                                                </span>
                                                <span className="text-zinc-600 text-xs hidden sm:inline">
                                                    @{s.username}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {formatPage(s.current_page)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Device */}
                                        <div className="flex-shrink-0 text-zinc-600">
                                            {s.device_info?.device === 'Mobile' ? (
                                                <Smartphone className="w-4 h-4" />
                                            ) : (
                                                <Monitor className="w-4 h-4" />
                                            )}
                                        </div>

                                        {/* Duration */}
                                        <div className="flex-shrink-0 flex items-center gap-1 text-xs text-zinc-400">
                                            <Clock className="w-3 h-3" />
                                            {formatDuration(s.active_minutes)}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}
