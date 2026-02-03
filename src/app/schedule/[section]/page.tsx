'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSchedule, isLeaderOfSection, canAccessSection, type ScheduleEntry } from '../actions';
import { BookOpen, Clock, MapPin, Pencil, ChevronLeft, Home, Bell } from 'lucide-react';
import Link from 'next/link';
import { UpcomingClassCard } from '@/components/schedule/UpcomingClassCard';
import { ScheduleNotificationToggle } from '@/components/schedule/ScheduleNotificationToggle';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
const DAY_LABELS: Record<string, string> = {
    sunday: 'الأحد',
    monday: 'الإثنين',
    tuesday: 'الثلاثاء',
    wednesday: 'الأربعاء',
    thursday: 'الخميس'
};

const SUBJECT_COLORS: Record<string, string> = {
    'Physics': 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    'Chemistry': 'from-green-500/20 to-green-600/10 border-green-500/30',
    'Zoology': 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
    'Botany': 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    'Math': 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    'Computer': 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
    'Geology': 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
    'Unknown': 'from-gray-500/20 to-gray-600/10 border-gray-500/30'
};

export default function SchedulePage() {
    const params = useParams();
    const router = useRouter();
    const sectionId = (params.section as string).toUpperCase();

    const [schedule, setSchedule] = useState<Record<string, ScheduleEntry[]>>({});
    const [activeDay, setActiveDay] = useState(() => {
        const today = new Date().getDay();
        const dayIndex = today === 5 || today === 6 ? 0 : today;
        return DAYS[dayIndex] || 'sunday';
    });
    const [canEdit, setCanEdit] = useState(false);
    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);

            // Check access first
            const hasAccess = await canAccessSection(sectionId);
            if (!hasAccess) {
                setAccessDenied(true);
                setLoading(false);
                return;
            }

            const [scheduleData, isLeader] = await Promise.all([
                getSchedule(sectionId),
                isLeaderOfSection(sectionId)
            ]);
            setSchedule(scheduleData);
            setCanEdit(isLeader);
            setLoading(false);
        }
        fetchData();
    }, [sectionId]);

    const todaySchedule = schedule[activeDay] || [];

    if (accessDenied) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4 md:p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔒</div>
                    <h1 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h1>
                    <p className="text-gray-400 mb-4">You can only view your own section's schedule.</p>
                    <Link href="/" className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300">
                        <Home size={20} />
                        Go Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4 md:p-8">
            {/* Header */}
            <div className="max-w-4xl mx-auto mb-8">
                <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4">
                    <ChevronLeft size={20} />
                    <span>Home</span>
                </Link>

                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
                        Schedule - Section {sectionId}
                    </h1>

                    <div className="flex items-center gap-2">
                        <ScheduleNotificationToggle sectionId={sectionId} />
                        {canEdit && (
                            <Link
                                href={`/schedule/${sectionId.toLowerCase()}/edit`}
                                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
                            >
                                <Pencil size={16} />
                                <span>Edit</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Upcoming Class Card */}
            <div className="max-w-4xl mx-auto mb-6">
                <UpcomingClassCard sectionId={sectionId} />
            </div>

            {/* Day Tabs */}
            <div className="max-w-4xl mx-auto mb-6">
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {DAYS.map(day => (
                        <button
                            key={day}
                            onClick={() => setActiveDay(day)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeDay === day
                                ? 'bg-violet-600 text-white'
                                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                                }`}
                        >
                            {DAY_LABELS[day]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Schedule Cards */}
            <div className="max-w-4xl mx-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
                    </div>
                ) : todaySchedule.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No classes scheduled for this day</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {todaySchedule.map((entry, idx) => (
                            <div
                                key={idx}
                                className={`p-4 rounded-xl border bg-gradient-to-r ${SUBJECT_COLORS[entry.subject] || SUBJECT_COLORS['Unknown']
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">
                                            {entry.subject}
                                        </h3>
                                        <p className="text-sm text-gray-300">{entry.class_type}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 text-sm text-gray-300">
                                            <Clock size={14} />
                                            <span>{entry.time_start}:00 - {entry.time_end}:00</span>
                                        </div>
                                        {entry.room && (
                                            <div className="flex items-center gap-1 text-sm text-gray-400 mt-1">
                                                <MapPin size={14} />
                                                <span>{entry.room}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
