'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ResponsiveContainer,
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    AreaChart,
    Area,
    Cell,
} from 'recharts';
import { TrendingUp, BarChart3, Target } from 'lucide-react';
import type { SubjectPerformance } from '@/lib/gamification';
import type { XPHistoryPoint } from '@/lib/gamification';

interface ProfileChartsProps {
    subjectPerformance: SubjectPerformance[];
    xpHistory: XPHistoryPoint[];
}

function getBarColor(score: number): string {
    if (score >= 85) return '#10b981'; // emerald
    if (score >= 70) return '#3b82f6'; // blue
    if (score >= 60) return '#eab308'; // yellow
    return '#ef4444'; // red
}

export function ProfileCharts({ subjectPerformance, xpHistory }: ProfileChartsProps) {
    const hasSubjects = subjectPerformance.length > 0;
    const hasXPHistory = xpHistory.length > 1;

    if (!hasSubjects && !hasXPHistory) return null;

    // Prepare radar data
    const radarData = subjectPerformance.map(s => ({
        subject: s.courseCode,
        score: s.averageScore,
        fullMark: 100,
    }));

    // Prepare bar chart data
    const barData = subjectPerformance.map(s => ({
        name: s.courseCode,
        score: s.averageScore,
        fill: getBarColor(s.averageScore),
    }));

    return (
        <div className="space-y-6 mb-8">
            {/* Charts Grid */}
            <div className={`grid grid-cols-1 ${hasSubjects && hasXPHistory ? 'lg:grid-cols-2' : ''} gap-4 sm:gap-6`}>

                {/* Radar Chart — Course Performance Overview */}
                {hasSubjects && subjectPerformance.length >= 3 && (
                    <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Target className="h-5 w-5 text-violet-400" />
                                Performance Radar
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px] sm:h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                        <PolarGrid stroke="#333" />
                                        <PolarAngleAxis
                                            dataKey="subject"
                                            tick={{ fill: '#a1a1aa', fontSize: 11 }}
                                        />
                                        <PolarRadiusAxis
                                            angle={90}
                                            domain={[0, 100]}
                                            tick={{ fill: '#666', fontSize: 10 }}
                                            tickCount={5}
                                        />
                                        <Radar
                                            name="Score"
                                            dataKey="score"
                                            stroke="#8b5cf6"
                                            fill="#8b5cf6"
                                            fillOpacity={0.25}
                                            strokeWidth={2}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* XP Progress Over Time */}
                {hasXPHistory && (
                    <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <TrendingUp className="h-5 w-5 text-emerald-400" />
                                XP Progress
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px] sm:h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={xpHistory}>
                                        <defs>
                                            <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#666"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#666"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            width={35}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#18181b',
                                                borderColor: '#27272a',
                                                color: '#fff',
                                                fontSize: '12px',
                                                borderRadius: '8px',
                                            }}
                                            formatter={(value) => [`${value} XP`, 'Total XP']}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="xp"
                                            stroke="#10b981"
                                            strokeWidth={2}
                                            fill="url(#xpGradient)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Course Scores Bar Chart — Full Width */}
            {hasSubjects && (
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <BarChart3 className="h-5 w-5 text-blue-400" />
                            Average Score by Subject
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-2 sm:px-6">
                        <div className="h-[200px] sm:h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData} layout="vertical" margin={{ left: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                    <XAxis
                                        type="number"
                                        domain={[0, 100]}
                                        stroke="#666"
                                        fontSize={10}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        stroke="#666"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        width={50}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#18181b',
                                            borderColor: '#27272a',
                                            color: '#fff',
                                            fontSize: '12px',
                                            borderRadius: '8px',
                                        }}
                                        formatter={(value) => [`${value}%`, 'Avg Score']}
                                    />
                                    <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                                        {barData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
