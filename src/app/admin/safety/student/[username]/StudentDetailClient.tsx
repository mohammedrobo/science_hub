'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    ArrowLeft,
    Shield,
    Activity,
    BookOpen,
    MessageSquare,
    Clock,
    Calendar,
    TrendingUp,
    Target,
    Pin,
    Trash2,
    Send,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    User,
    GraduationCap,
    Flame,
    Eye,
    Timer,
    Globe,
    Monitor,
    Lock,
    Wifi,
    MessageCircle,
} from 'lucide-react';
import { StudentTimeStats } from '../../_components/StudentTimeStats';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Cell,
} from 'recharts';
import Link from 'next/link';
import { toast } from 'sonner';
import { toggleWatchlist, getWatchlistStatus, addStudentNote, deleteStudentNote } from '../../actions';
import { EngagementScoreGauge } from '../../_components/EngagementScoreGauge';
import { ActivityHeatmap } from '../../_components/ActivityHeatmap';
import type { EngagementScore, HeatmapCell } from '@/lib/safety/analytics';

interface StudentDetailClientProps {
    data: {
        profile: {
            id: string;
            username: string;
            full_name: string;
            access_role: string;
            original_group: string | null;
            original_section: string | null;
            created_at: string;
            last_login_at: string | null;
            profile_picture_url: string | null;
            engagement: EngagementScore | null;
            xp: number;
            rank: string;
            quizzesTaken: number;
        };
        reports: any[];
        recentActivity: any[];
        progress: any[];
        notes: any[];
        dailyActivity: { date: string; actions: number }[];
        heatmap: HeatmapCell[];
    };
    username: string;
    sessionHistory: any[];
    securityData: {
        logs: any[];
        summary: {
            uniqueIps: string[];
            uniqueDevices: string[];
            failedLogins: number;
            totalLogins: number;
            ipCount: number;
            deviceCount: number;
        };
    };
    academicData: {
        progress: any[];
        quizzes: any[];
        stats: any;
        gradeDistribution: { A: number; B: number; C: number; D: number; F: number };
        totalLessonsCompleted: number;
        totalQuizzes: number;
        averageQuizScore: number;
    };
    chatHistory: any[];
}

// ─────────────────────────────────────────────────────────
// Action color helper
// ─────────────────────────────────────────────────────────
function getActionColor(action: string) {
    if (action === 'LOGIN') return 'bg-green-500';
    if (action === 'LOGOUT') return 'bg-zinc-500';
    if (action.includes('FAIL')) return 'bg-red-500';
    if (action === 'PAGE_VIEW') return 'bg-blue-400';
    if (action === 'QUIZ_SUBMIT') return 'bg-purple-500';
    if (action === 'LESSON_VIEW') return 'bg-cyan-500';
    return 'bg-zinc-400';
}

function getActionIcon(action: string) {
    if (action === 'LOGIN') return <CheckCircle2 className="w-3 h-3" />;
    if (action === 'LOGOUT') return <XCircle className="w-3 h-3" />;
    if (action.includes('FAIL')) return <AlertTriangle className="w-3 h-3" />;
    if (action === 'PAGE_VIEW') return <Eye className="w-3 h-3" />;
    if (action === 'QUIZ_SUBMIT') return <Target className="w-3 h-3" />;
    if (action === 'LESSON_VIEW') return <BookOpen className="w-3 h-3" />;
    return <Activity className="w-3 h-3" />;
}

function getRiskColor(level: string) {
    switch (level) {
        case 'High': return 'text-red-500 bg-red-500/10 border-red-500/20';
        case 'Medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
        default: return 'text-green-500 bg-green-500/10 border-green-500/20';
    }
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

// ─────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────
export function StudentDetailClient({ data, username, sessionHistory, securityData, academicData, chatHistory }: StudentDetailClientProps) {
    const { profile, reports, recentActivity, progress, notes: initialNotes, dailyActivity, heatmap } = data;
    const engagement = profile.engagement;

    const [isWatched, setIsWatched] = useState(false);
    const [watchLoading, setWatchLoading] = useState(false);
    const [notes, setNotes] = useState(initialNotes);
    const [newNote, setNewNote] = useState('');
    const [noteCategory, setNoteCategory] = useState<string>('general');
    const [noteLoading, setNoteLoading] = useState(false);

    // Check watchlist on mount
    useEffect(() => {
        getWatchlistStatus(username).then(res => setIsWatched(res.watching));
    }, [username]);

    const handleToggleWatchlist = async () => {
        setWatchLoading(true);
        try {
            const res = await toggleWatchlist(username);
            setIsWatched(res.watching);
            toast.success(res.watching ? 'Added to watchlist' : 'Removed from watchlist');
        } catch {
            toast.error('Failed to update watchlist');
        } finally {
            setWatchLoading(false);
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        setNoteLoading(true);
        try {
            const res = await addStudentNote(username, newNote.trim(), noteCategory as any);
            if ('error' in res) {
                toast.error(res.error);
            } else {
                setNotes(prev => [res.note, ...prev]);
                setNewNote('');
                toast.success('Note added');
            }
        } finally {
            setNoteLoading(false);
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        const res = await deleteStudentNote(noteId);
        if ('error' in res) {
            toast.error(res.error);
        } else {
            setNotes(prev => prev.filter((n: any) => n.id !== noteId));
            toast.success('Note deleted');
        }
    };

    // ── Radar chart data ──
    // loginFrequency is already 0-100, other metrics need normalization
    const radarData = engagement ? [
        { subject: 'Login Freq', value: Math.min(engagement.metrics.loginFrequency, 100), fullMark: 100 },
        { subject: 'Quiz Part.', value: Math.min(engagement.metrics.quizParticipation * 10, 100), fullMark: 100 },
        { subject: 'Lesson Eng.', value: Math.min(engagement.metrics.lessonEngagement * 5, 100), fullMark: 100 },
        { subject: 'Session Dur.', value: Math.min(engagement.metrics.sessionDuration * 2, 100), fullMark: 100 },
        { subject: 'Page Diversity', value: Math.min(engagement.metrics.pageViewDiversity * 5, 100), fullMark: 100 },
        { subject: 'Consistency', value: Math.min(engagement.metrics.consistencyStreak * 7, 100), fullMark: 100 },
    ] : [];

    // ── Activity by action type ──
    const actionTypeCounts: Record<string, number> = {};
    for (const a of recentActivity) {
        actionTypeCounts[a.action_type] = (actionTypeCounts[a.action_type] || 0) + 1;
    }
    const actionBarData = Object.entries(actionTypeCounts)
        .map(([type, count]) => ({ type: type.replace('_', ' '), count }))
        .sort((a, b) => b.count - a.count);

    // ── Lesson completion progress ──
    const completedLessons = progress.filter((p: any) => p.completed_at).length;
    const quizProgress = progress.filter((p: any) => p.content_type === 'quiz').length;

    // ── Group sessions ──
    const sessions: { start: string; end: string; actions: number }[] = [];
    let sessionStart: string | null = null;
    let sessionActions = 0;
    for (const a of recentActivity) {
        if (a.action_type === 'LOGIN') {
            sessionStart = a.created_at;
            sessionActions = 1;
        } else if (a.action_type === 'LOGOUT' && sessionStart) {
            sessions.push({ start: sessionStart, end: a.created_at, actions: sessionActions });
            sessionStart = null;
            sessionActions = 0;
        } else if (sessionStart) {
            sessionActions++;
        }
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
            {/* ── Top Bar ── */}
            <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/safety">
                            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                            </Button>
                        </Link>
                        <Separator orientation="vertical" className="h-6 bg-zinc-800" />
                        <div className="flex items-center gap-3">
                            {profile.profile_picture_url ? (
                                <img
                                    src={profile.profile_picture_url}
                                    alt={profile.full_name}
                                    className="w-10 h-10 rounded-full border-2 border-zinc-700"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center">
                                    <User className="w-5 h-5 text-zinc-400" />
                                </div>
                            )}
                            <div>
                                <h1 className="text-lg font-bold">{profile.full_name || username}</h1>
                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                    <span>@{username}</span>
                                    {profile.original_section && (
                                        <>
                                            <span>·</span>
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-zinc-700">
                                                Section {profile.original_section}
                                            </Badge>
                                        </>
                                    )}
                                    {profile.original_group && (
                                        <>
                                            <span>·</span>
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-zinc-700">
                                                Group {profile.original_group}
                                            </Badge>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {engagement && (
                            <Badge variant="outline" className={getRiskColor(engagement.riskScore > 30 ? 'High' : engagement.riskScore > 15 ? 'Medium' : 'Low')}>
                                {engagement.riskScore > 30 ? 'High' : engagement.riskScore > 15 ? 'Medium' : 'Low'} Risk
                            </Badge>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={watchLoading}
                            onClick={handleToggleWatchlist}
                            className={`border-zinc-800 ${isWatched ? 'bg-primary/20 text-primary border-primary/50' : 'bg-transparent text-zinc-400 hover:text-white'}`}
                        >
                            <Pin className={`w-4 h-4 mr-1 ${isWatched ? 'fill-current' : ''}`} />
                            {isWatched ? 'Pinned' : 'Pin'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Main Content ── */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* ── Hero Stats Row ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                    <Card className="bg-zinc-900/50 border-zinc-800 col-span-2">
                        <CardContent className="p-4 flex items-center gap-4">
                            {engagement && <EngagementScoreGauge score={engagement.score} size="lg" />}
                            <div>
                                <div className="text-sm text-zinc-400">Engagement Score</div>
                                <div className="text-3xl font-bold text-white">{engagement?.score || 0}</div>
                                <div className="text-xs text-zinc-500">out of 100</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-zinc-500 text-sm mb-1">
                                <TrendingUp className="w-4 h-4" /> XP
                            </div>
                            <div className="text-2xl font-bold">{profile.xp.toLocaleString()}</div>
                            <div className="text-xs text-zinc-500">{profile.rank}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-zinc-500 text-sm mb-1">
                                <Target className="w-4 h-4" /> Quizzes
                            </div>
                            <div className="text-2xl font-bold">{profile.quizzesTaken}</div>
                            <div className="text-xs text-zinc-500">{quizProgress} completed</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-zinc-500 text-sm mb-1">
                                <BookOpen className="w-4 h-4" /> Lessons
                            </div>
                            <div className="text-2xl font-bold">{completedLessons}</div>
                            <div className="text-xs text-zinc-500">completed</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-zinc-500 text-sm mb-1">
                                <Shield className="w-4 h-4" /> Reports
                            </div>
                            <div className="text-2xl font-bold">{reports.length}</div>
                            <div className="text-xs text-zinc-500">
                                {reports.filter((r: any) => !r.resolved).length} unresolved
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Tabs ── */}
                <Tabs defaultValue="engagement" className="space-y-4">
                    <TabsList className="bg-zinc-900 border border-zinc-800 p-1 flex-wrap h-auto">
                        <TabsTrigger value="engagement" className="data-[state=active]:bg-zinc-800 text-xs sm:text-sm">
                            <Activity className="w-4 h-4 mr-1.5" /> Engagement
                        </TabsTrigger>
                        <TabsTrigger value="academic" className="data-[state=active]:bg-zinc-800 text-xs sm:text-sm">
                            <GraduationCap className="w-4 h-4 mr-1.5" /> Academic
                        </TabsTrigger>
                        <TabsTrigger value="activity" className="data-[state=active]:bg-zinc-800 text-xs sm:text-sm">
                            <Clock className="w-4 h-4 mr-1.5" /> Timeline
                        </TabsTrigger>
                        <TabsTrigger value="sessions" className="data-[state=active]:bg-zinc-800 text-xs sm:text-sm">
                            <Globe className="w-4 h-4 mr-1.5" /> Sessions ({sessionHistory.length})
                        </TabsTrigger>
                        <TabsTrigger value="security" className="data-[state=active]:bg-zinc-800 text-xs sm:text-sm">
                            <Lock className="w-4 h-4 mr-1.5" /> Security
                        </TabsTrigger>
                        <TabsTrigger value="chat" className="data-[state=active]:bg-zinc-800 text-xs sm:text-sm">
                            <MessageCircle className="w-4 h-4 mr-1.5" /> Chat ({chatHistory.length})
                        </TabsTrigger>
                        <TabsTrigger value="time" className="data-[state=active]:bg-zinc-800 text-xs sm:text-sm">
                            <Timer className="w-4 h-4 mr-1.5" /> Time Tracking
                        </TabsTrigger>
                        <TabsTrigger value="notes" className="data-[state=active]:bg-zinc-800 text-xs sm:text-sm">
                            <MessageSquare className="w-4 h-4 mr-1.5" /> Notes ({notes.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* ════════════════════════════════════════════ */}
                    {/* TAB: Engagement                             */}
                    {/* ════════════════════════════════════════════ */}
                    <TabsContent value="engagement" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Radar Chart */}
                            <Card className="bg-zinc-900/50 border-zinc-800">
                                <CardHeader>
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <Target className="w-4 h-4 text-zinc-400" /> Engagement Breakdown
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0}>
                                        <RadarChart data={radarData}>
                                            <PolarGrid stroke="#3f3f46" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} />
                                            <Radar
                                                name="Score"
                                                dataKey="value"
                                                stroke="#3b82f6"
                                                fill="#3b82f6"
                                                fillOpacity={0.2}
                                                strokeWidth={2}
                                            />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Activity Heatmap */}
                            <Card className="bg-zinc-900/50 border-zinc-800">
                                <CardHeader>
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <Flame className="w-4 h-4 text-zinc-400" /> Activity Heatmap
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ActivityHeatmap data={heatmap} />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Daily Activity Chart */}
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-zinc-400" /> Daily Activity (Last 30 Days)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={200} minWidth={0} minHeight={0}>
                                    <AreaChart data={dailyActivity}>
                                        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fill: '#71717a', fontSize: 10 }}
                                            tickFormatter={(d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                        />
                                        <YAxis tick={{ fill: '#71717a', fontSize: 10 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                                            labelStyle={{ color: '#e4e4e7' }}
                                            itemStyle={{ color: '#3b82f6' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="actions"
                                            stroke="#3b82f6"
                                            fill="url(#activityGradient)"
                                            strokeWidth={2}
                                        />
                                        <defs>
                                            <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Login Calendar (streak visualization) */}
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-zinc-400" /> Login Streak Calendar
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <LoginStreakCalendar activities={recentActivity} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ════════════════════════════════════════════ */}
                    {/* TAB: Academic                               */}
                    {/* ════════════════════════════════════════════ */}
                    <TabsContent value="academic" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Action Type Distribution */}
                            <Card className="bg-zinc-900/50 border-zinc-800">
                                <CardHeader>
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-zinc-400" /> Activity Distribution
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={250} minWidth={0} minHeight={0}>
                                        <BarChart data={actionBarData} layout="vertical">
                                            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" tick={{ fill: '#71717a', fontSize: 10 }} />
                                            <YAxis dataKey="type" type="category" tick={{ fill: '#a1a1aa', fontSize: 10 }} width={100} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                                                labelStyle={{ color: '#e4e4e7' }}
                                            />
                                            <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Academic Summary */}
                            <Card className="bg-zinc-900/50 border-zinc-800">
                                <CardHeader>
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <GraduationCap className="w-4 h-4 text-zinc-400" /> Academic Summary
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-zinc-400">Total XP</span>
                                            <span className="font-bold text-lg">{profile.xp.toLocaleString()}</span>
                                        </div>
                                        <Separator className="bg-zinc-800" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-zinc-400">Current Rank</span>
                                            <Badge variant="outline" className="border-zinc-700">{profile.rank}</Badge>
                                        </div>
                                        <Separator className="bg-zinc-800" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-zinc-400">Quizzes Taken</span>
                                            <span className="font-bold">{profile.quizzesTaken}</span>
                                        </div>
                                        <Separator className="bg-zinc-800" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-zinc-400">Lessons Completed</span>
                                            <span className="font-bold">{completedLessons}</span>
                                        </div>
                                        <Separator className="bg-zinc-800" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-zinc-400">Account Created</span>
                                            <span className="text-sm text-zinc-300">{new Date(profile.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <Separator className="bg-zinc-800" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-zinc-400">Last Login</span>
                                            <span className="text-sm text-zinc-300">
                                                {profile.last_login_at ? timeAgo(profile.last_login_at) : 'Never'}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Per-Course Breakdown */}
                        {engagement?.courseScores && engagement.courseScores.length > 0 && (
                            <Card className="bg-zinc-900/50 border-zinc-800">
                                <CardHeader>
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-purple-400" /> Performance by Course
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {engagement.courseScores.map(cs => (
                                            <div key={cs.courseCode} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                        <span className="text-sm font-semibold text-zinc-200">{cs.courseCode}</span>
                                                        <span className="text-xs text-zinc-500 ml-2">{cs.courseName}</span>
                                                    </div>
                                                    <Badge variant="outline" className={`text-xs ${
                                                        cs.avgScore >= 80 ? 'border-emerald-500/30 text-emerald-400' :
                                                        cs.avgScore >= 60 ? 'border-blue-500/30 text-blue-400' :
                                                        cs.avgScore >= 40 ? 'border-yellow-500/30 text-yellow-400' :
                                                        'border-red-500/30 text-red-400'
                                                    }`}>
                                                        {cs.avgScore}% avg
                                                    </Badge>
                                                </div>
                                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-700"
                                                        style={{
                                                            width: `${cs.avgScore}%`,
                                                            backgroundColor: cs.avgScore >= 80 ? '#22c55e' : cs.avgScore >= 60 ? '#3b82f6' : cs.avgScore >= 40 ? '#eab308' : '#ef4444'
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex gap-4 text-[11px] text-zinc-500">
                                                    <span>Quizzes: <span className="text-zinc-300 font-mono">{cs.quizCount}</span></span>
                                                    <span>Best: <span className="text-amber-400 font-mono">{cs.bestScore}%</span></span>
                                                    <span>Lessons: <span className="text-cyan-400 font-mono">{cs.lessonsCompleted}</span></span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Quiz Score History */}
                        {academicData.quizzes.length > 0 && (
                            <Card className="bg-zinc-900/50 border-zinc-800">
                                <CardHeader>
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <Target className="w-4 h-4 text-purple-400" /> Quiz Score History
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={200} minWidth={0} minHeight={0}>
                                        <BarChart data={academicData.quizzes.slice(0, 20).reverse()}>
                                            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
                                            <XAxis
                                                dataKey="completed_at"
                                                tick={{ fill: '#71717a', fontSize: 9 }}
                                                tickFormatter={(d) => d ? new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : ''}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis tick={{ fill: '#71717a', fontSize: 10 }} domain={[0, 100]} width={28} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                                                labelStyle={{ color: '#e4e4e7' }}
                                                labelFormatter={(d) => d ? new Date(d).toLocaleDateString() : ''}
                                            />
                                            <Bar dataKey="score" name="Score" radius={[4, 4, 0, 0]} barSize={20}>
                                                {academicData.quizzes.slice(0, 20).reverse().map((q: any, i: number) => {
                                                    const s = q.score || 0;
                                                    const color = s >= 80 ? '#22c55e' : s >= 60 ? '#3b82f6' : s >= 40 ? '#eab308' : '#ef4444';
                                                    return <Cell key={i} fill={color} />;
                                                })}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        )}

                        {/* Grade Distribution */}
                        {(() => {
                            const gd = academicData.gradeDistribution;
                            const total = gd.A + gd.B + gd.C + gd.D + gd.F;
                            if (total === 0) return null;
                            const gradeColors: Record<string, string> = { A: '#22c55e', B: '#3b82f6', C: '#eab308', D: '#f97316', F: '#ef4444' };
                            return (
                                <Card className="bg-zinc-900/50 border-zinc-800">
                                    <CardHeader>
                                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                                            <GraduationCap className="w-4 h-4 text-amber-400" /> Grade Distribution
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {Object.entries(gd).map(([grade, count]) => {
                                                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                                return (
                                                    <div key={grade} className="flex items-center gap-3">
                                                        <span className="text-sm font-bold w-5 text-center" style={{ color: gradeColors[grade] }}>{grade}</span>
                                                        <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: gradeColors[grade] }} />
                                                        </div>
                                                        <span className="text-xs font-mono text-zinc-400 w-16 text-right">{count} ({pct}%)</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })()}

                        {/* Reports Section */}
                        {reports.length > 0 && (
                            <Card className="bg-zinc-900/50 border-zinc-800">
                                <CardHeader>
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-red-400" /> Reports ({reports.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {reports.map((report: any) => (
                                            <div key={report.id} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-start justify-between">
                                                <div>
                                                    <div className="text-sm font-medium">{report.reason}</div>
                                                    {report.description && (
                                                        <div className="text-xs text-zinc-500 mt-1">{report.description}</div>
                                                    )}
                                                    <div className="text-xs text-zinc-600 mt-1">
                                                        Reported by {report.reporter_username} · {timeAgo(report.created_at)}
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className={report.resolved ? 'border-green-500/30 text-green-500' : 'border-red-500/30 text-red-500'}>
                                                    {report.resolved ? 'Resolved' : 'Open'}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Recent Sessions */}
                        {sessions.length > 0 && (
                            <Card className="bg-zinc-900/50 border-zinc-800">
                                <CardHeader>
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-zinc-400" /> Recent Sessions
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {sessions.slice(0, 10).map((s, i) => {
                                            const duration = Math.round((new Date(s.end).getTime() - new Date(s.start).getTime()) / 60000);
                                            return (
                                                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                                                        <span className="text-zinc-300">{new Date(s.start).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                                                        <span>{duration} min</span>
                                                        <span>{s.actions} actions</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* ════════════════════════════════════════════ */}
                    {/* TAB: Timeline                               */}
                    {/* ════════════════════════════════════════════ */}
                    <TabsContent value="activity" className="space-y-4">
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-zinc-400" /> Full Activity Timeline
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="relative border-l-2 border-zinc-800 ml-4 space-y-1">
                                    {recentActivity.map((log: any, i: number) => (
                                        <div key={log.id || i} className="ml-6 relative py-2">
                                            <div className={`absolute -left-[29px] w-3.5 h-3.5 rounded-full border-2 border-zinc-950 ${getActionColor(log.action_type)} flex items-center justify-center`}>
                                            </div>
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                                                        {log.action_type}
                                                    </span>
                                                    {log.details?.path && (
                                                        <span className="text-xs text-zinc-500 truncate max-w-[300px]">
                                                            {log.details.path}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-zinc-600 whitespace-nowrap ml-2">
                                                    {timeAgo(log.created_at)}
                                                </span>
                                            </div>
                                            {log.details && !log.details.path && Object.keys(log.details).length > 0 && (
                                                <div className="text-xs bg-zinc-900 p-2 rounded border border-zinc-800 text-zinc-500 mt-1 max-w-lg overflow-hidden">
                                                    {JSON.stringify(log.details, null, 2)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {recentActivity.length === 0 && (
                                        <p className="ml-6 text-zinc-500 italic py-4">No activity recorded for this student.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ════════════════════════════════════════════ */}
                    {/* TAB: Session History                        */}
                    {/* ════════════════════════════════════════════ */}
                    <TabsContent value="sessions" className="space-y-4">
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-zinc-400" /> Session History
                                    <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-xs">{sessionHistory.length} sessions</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {sessionHistory.length === 0 ? (
                                    <p className="text-zinc-500 text-sm text-center py-8">No session history recorded.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {sessionHistory.map((s: any, i: number) => {
                                            const duration = s.duration_seconds
                                                ? `${Math.floor(s.duration_seconds / 60)}m ${s.duration_seconds % 60}s`
                                                : s.started_at && s.ended_at
                                                    ? `${Math.floor((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000)}m`
                                                    : s.is_active ? 'Active now' : 'Unknown';
                                            const pagesVisited = s.pages_visited || [];
                                            const device = s.device_info?.device || 'Unknown';

                                            return (
                                                <div key={s.session_id || i} className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Monitor className="w-4 h-4 text-zinc-500" />
                                                            <span className="text-sm font-medium text-zinc-300">
                                                                {new Date(s.started_at).toLocaleString()}
                                                            </span>
                                                            {s.is_active && (
                                                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                                                                    LIVE
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" /> {duration}
                                                            </span>
                                                            <span>{device}</span>
                                                        </div>
                                                    </div>
                                                    {pagesVisited.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {pagesVisited.slice(0, 10).map((page: string, pi: number) => (
                                                                <Badge key={pi} variant="outline" className="text-[10px] border-zinc-700 text-zinc-500">
                                                                    {page}
                                                                </Badge>
                                                            ))}
                                                            {pagesVisited.length > 10 && (
                                                                <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-500">
                                                                    +{pagesVisited.length - 10} more
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ════════════════════════════════════════════ */}
                    {/* TAB: Security                               */}
                    {/* ════════════════════════════════════════════ */}
                    <TabsContent value="security" className="space-y-6">
                        {/* Security Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card className="bg-zinc-900/50 border-zinc-800">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2 text-zinc-500 text-sm mb-1">
                                        <CheckCircle2 className="w-4 h-4 text-green-400" /> Total Logins
                                    </div>
                                    <div className="text-2xl font-bold">{securityData.summary.totalLogins}</div>
                                </CardContent>
                            </Card>
                            <Card className="bg-zinc-900/50 border-zinc-800">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2 text-zinc-500 text-sm mb-1">
                                        <AlertTriangle className="w-4 h-4 text-red-400" /> Failed Logins
                                    </div>
                                    <div className={`text-2xl font-bold ${securityData.summary.failedLogins > 5 ? 'text-red-400' : ''}`}>
                                        {securityData.summary.failedLogins}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-zinc-900/50 border-zinc-800">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2 text-zinc-500 text-sm mb-1">
                                        <Wifi className="w-4 h-4 text-blue-400" /> Unique IPs
                                    </div>
                                    <div className={`text-2xl font-bold ${securityData.summary.ipCount > 5 ? 'text-yellow-400' : ''}`}>
                                        {securityData.summary.ipCount}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-zinc-900/50 border-zinc-800">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2 text-zinc-500 text-sm mb-1">
                                        <Monitor className="w-4 h-4 text-violet-400" /> Devices
                                    </div>
                                    <div className="text-2xl font-bold">{securityData.summary.deviceCount}</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Known IPs */}
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <Wifi className="w-4 h-4 text-zinc-400" /> IP Addresses Used
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {securityData.summary.uniqueIps.length > 0 ? (
                                        securityData.summary.uniqueIps.map((ip, i) => (
                                            <Badge key={i} variant="outline" className="border-zinc-700 text-zinc-300 font-mono text-xs">
                                                {ip}
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-zinc-500 text-sm">No IP data available</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Known Devices */}
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <Monitor className="w-4 h-4 text-zinc-400" /> Devices Used
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {securityData.summary.uniqueDevices.length > 0 ? (
                                        securityData.summary.uniqueDevices.map((device, i) => (
                                            <Badge key={i} variant="outline" className="border-zinc-700 text-zinc-300 text-xs">
                                                {device}
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-zinc-500 text-sm">No device data available</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Security Event Log */}
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-zinc-400" /> Security Event Log
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="relative border-l-2 border-zinc-800 ml-4 space-y-1 max-h-[500px] overflow-y-auto">
                                    {securityData.logs.map((log: any, i: number) => (
                                        <div key={log.id || i} className="ml-6 relative py-2">
                                            <div className={`absolute -left-[29px] w-3.5 h-3.5 rounded-full border-2 border-zinc-950 ${getActionColor(log.action_type)}`} />
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                                                        log.action_type === 'LOGIN_FAILED' ? 'bg-red-500/10 text-red-400' :
                                                        log.action_type === 'LOGIN' ? 'bg-green-500/10 text-green-400' :
                                                        log.action_type === 'PASSWORD_CHANGE' ? 'bg-yellow-500/10 text-yellow-400' :
                                                        'bg-zinc-800 text-zinc-300'
                                                    }`}>
                                                        {log.action_type}
                                                    </span>
                                                    {log.ip_address && log.ip_address !== 'unknown' && (
                                                        <span className="text-[10px] text-zinc-600 font-mono">{log.ip_address}</span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-zinc-600 whitespace-nowrap ml-2">
                                                    {timeAgo(log.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {securityData.logs.length === 0 && (
                                        <p className="ml-6 text-zinc-500 italic py-4">No security events recorded.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ════════════════════════════════════════════ */}
                    {/* TAB: Chat History                           */}
                    {/* ════════════════════════════════════════════ */}
                    <TabsContent value="chat" className="space-y-4">
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <MessageCircle className="w-4 h-4 text-zinc-400" /> Guild Chat Messages
                                    <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-xs">{chatHistory.length} messages</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {chatHistory.length === 0 ? (
                                    <p className="text-zinc-500 text-sm text-center py-8">No chat messages found.</p>
                                ) : (
                                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                        {chatHistory.map((msg: any) => (
                                            <div key={msg.id} className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                                                <div className="flex items-start justify-between">
                                                    <p className="text-sm text-zinc-300 break-words flex-1">{msg.content}</p>
                                                    <span className="text-[10px] text-zinc-600 whitespace-nowrap ml-3">
                                                        {timeAgo(msg.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ════════════════════════════════════════════ */}
                    {/* TAB: Time Tracking                          */}
                    {/* ════════════════════════════════════════════ */}
                    <TabsContent value="time" className="space-y-4">
                        <StudentTimeStats username={profile.username} />
                    </TabsContent>

                    {/* ════════════════════════════════════════════ */}
                    {/* TAB: Notes                                  */}
                    {/* ════════════════════════════════════════════ */}
                    <TabsContent value="notes" className="space-y-4">
                        {/* Add Note Form */}
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-zinc-400" /> Add Observation Note
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <Select value={noteCategory} onValueChange={setNoteCategory}>
                                        <SelectTrigger className="w-[140px] bg-zinc-900 border-zinc-700 text-zinc-300">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-700">
                                            <SelectItem value="general">General</SelectItem>
                                            <SelectItem value="behavioral">Behavioral</SelectItem>
                                            <SelectItem value="academic">Academic</SelectItem>
                                            <SelectItem value="urgent">Urgent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Textarea
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Write an observation note about this student..."
                                    className="bg-zinc-900 border-zinc-700 text-zinc-200 min-h-[80px] resize-none"
                                />
                                <Button
                                    onClick={handleAddNote}
                                    disabled={!newNote.trim() || noteLoading}
                                    className="w-full sm:w-auto"
                                >
                                    <Send className="w-4 h-4 mr-2" /> Add Note
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Notes List */}
                        {notes.length > 0 ? (
                            <div className="space-y-3">
                                {notes.map((note: any) => {
                                    const categoryColors: Record<string, string> = {
                                        general: 'border-zinc-700 bg-zinc-900/50',
                                        behavioral: 'border-yellow-500/20 bg-yellow-500/5',
                                        academic: 'border-blue-500/20 bg-blue-500/5',
                                        urgent: 'border-red-500/20 bg-red-500/5',
                                    };
                                    return (
                                        <Card key={note.id} className={`${categoryColors[note.category] || categoryColors.general} border`}>
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Badge variant="outline" className="text-[10px] uppercase border-zinc-700">
                                                                {note.category}
                                                            </Badge>
                                                            <span className="text-xs text-zinc-500">
                                                                {timeAgo(note.created_at)}
                                                            </span>
                                                            <span className="text-xs text-zinc-600">
                                                                by {note.admin_username}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-zinc-300 whitespace-pre-wrap">{note.note_text}</p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteNote(note.id)}
                                                        className="text-zinc-600 hover:text-red-400 ml-2 shrink-0"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        ) : (
                            <Card className="bg-zinc-900/50 border-zinc-800">
                                <CardContent className="p-8 text-center text-zinc-500">
                                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>No observation notes yet.</p>
                                    <p className="text-xs mt-1">Use notes to track behavioral patterns, academic concerns, or important observations.</p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────
// Login Streak Calendar Component
// ─────────────────────────────────────────────────────────
function LoginStreakCalendar({ activities }: { activities: any[] }) {
    // Build a map of dates with login activity
    const loginDates = new Set<string>();
    for (const a of activities) {
        if (a.action_type === 'LOGIN') {
            loginDates.add(a.created_at.split('T')[0]);
        }
    }

    // Generate last 90 days
    const days: { date: string; hasLogin: boolean }[] = [];
    for (let i = 89; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        days.push({ date: dateStr, hasLogin: loginDates.has(dateStr) });
    }

    // Calculate streak
    let currentStreak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
        if (days[i].hasLogin) {
            currentStreak++;
        } else {
            break;
        }
    }

    // Calculate max streak
    let maxStreak = 0;
    let tempStreak = 0;
    for (const day of days) {
        if (day.hasLogin) {
            tempStreak++;
            maxStreak = Math.max(maxStreak, tempStreak);
        } else {
            tempStreak = 0;
        }
    }

    const totalLoginDays = days.filter(d => d.hasLogin).length;

    return (
        <div>
            <div className="flex items-center gap-6 mb-4">
                <div>
                    <div className="text-2xl font-bold text-white flex items-center gap-2">
                        <Flame className="w-5 h-5 text-orange-500" /> {currentStreak}
                    </div>
                    <div className="text-xs text-zinc-500">Current Streak</div>
                </div>
                <Separator orientation="vertical" className="h-8 bg-zinc-800" />
                <div>
                    <div className="text-2xl font-bold text-white">{maxStreak}</div>
                    <div className="text-xs text-zinc-500">Best Streak</div>
                </div>
                <Separator orientation="vertical" className="h-8 bg-zinc-800" />
                <div>
                    <div className="text-2xl font-bold text-white">{totalLoginDays}</div>
                    <div className="text-xs text-zinc-500">Login Days (90d)</div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex flex-wrap gap-1">
                {days.map((day) => (
                    <div
                        key={day.date}
                        title={`${day.date}${day.hasLogin ? ' — Logged in' : ' — No login'}`}
                        className={`w-3 h-3 rounded-sm transition-colors ${
                            day.hasLogin
                                ? 'bg-green-500/80 hover:bg-green-400'
                                : 'bg-zinc-800 hover:bg-zinc-700'
                        }`}
                    />
                ))}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-zinc-600">
                <span>Last 90 days</span>
                <span>·</span>
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-zinc-800" />
                    <span>No login</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-green-500/80" />
                    <span>Login day</span>
                </div>
            </div>
        </div>
    );
}
