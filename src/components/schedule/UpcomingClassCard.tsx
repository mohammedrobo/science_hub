'use client';

import { useState, useEffect } from 'react';
import { Clock, MapPin, Timer } from 'lucide-react';

interface UpcomingClassCardProps {
    scheduleByDay: Record<string, ScheduleEntry[]>;
}

interface ScheduleEntry {
    section_id: string;
    day_of_week: string;
    slot_order: number;
    subject: string;
    class_type: string;
    room?: string;
    time_start?: string;
    time_end?: string;
}

interface NextClassInfo {
    status: 'current' | 'next' | 'none';
    currentClass: ScheduleEntry | null;
    nextClass: ScheduleEntry | null;
    minutesUntil: number;
    todaySchedule: ScheduleEntry[];
}

function formatTimeRemaining(minutes: number): string {
    if (minutes <= 0) return 'Now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours >= 24) {
        const days = Math.floor(hours / 24);
        return `${days}d ${hours % 24}h`;
    }
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function getUrgencyColor(minutes: number): string {
    if (minutes <= 0) return 'from-green-600 to-emerald-600'; // In class
    if (minutes <= 15) return 'from-red-600 to-rose-600'; // Very urgent
    if (minutes <= 30) return 'from-orange-600 to-amber-600'; // Urgent
    if (minutes <= 60) return 'from-yellow-600 to-amber-500'; // Soon
    return 'from-violet-600 to-purple-600'; // Normal
}

function getClassTypeIcon(type: string) {
    switch (type.toLowerCase()) {
        case 'lecture':
            return '📚';
        case 'practical':
            return '🔬';
        case 'tutorial':
            return '✏️';
        default:
            return '📖';
    }
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function parseHour(value?: string): number | null {
    if (!value) return null;
    const hour = Number.parseInt(value.split(':')[0], 10);
    return Number.isNaN(hour) ? null : hour;
}

function getClassInfoFromSchedule(scheduleByDay: Record<string, ScheduleEntry[]>, now: Date): NextClassInfo {
    const today = DAYS[now.getDay()];
    const todaySchedule = [...(scheduleByDay[today] || [])].sort((a, b) => a.slot_order - b.slot_order);
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

    for (let i = 0; i < todaySchedule.length; i++) {
        const entry = todaySchedule[i];
        const startHour = parseHour(entry.time_start);
        const endHour = parseHour(entry.time_end);
        if (startHour === null || endHour === null) continue;

        const startMinutes = startHour * 60;
        const endMinutes = endHour * 60;

        if (currentTotalMinutes >= startMinutes && currentTotalMinutes < endMinutes) {
            const nextClass = i + 1 < todaySchedule.length ? todaySchedule[i + 1] : null;
            const nextStartHour = parseHour(nextClass?.time_start);
            const minutesUntil = nextClass && nextStartHour !== null
                ? Math.max(0, (nextStartHour * 60) - currentTotalMinutes)
                : 0;
            return {
                status: 'current',
                currentClass: entry,
                nextClass,
                minutesUntil,
                todaySchedule,
            };
        }

        if (currentTotalMinutes < startMinutes) {
            return {
                status: 'next',
                currentClass: null,
                nextClass: entry,
                minutesUntil: startMinutes - currentTotalMinutes,
                todaySchedule,
            };
        }
    }

    return {
        status: 'none',
        currentClass: null,
        nextClass: null,
        minutesUntil: 0,
        todaySchedule,
    };
}

export function UpcomingClassCard({ scheduleByDay }: UpcomingClassCardProps) {
    const [classInfo, setClassInfo] = useState<NextClassInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRemaining, setTimeRemaining] = useState<number>(0);

    useEffect(() => {
        function updateClassInfo() {
            const info = getClassInfoFromSchedule(scheduleByDay, new Date());
            setClassInfo(info);
            setTimeRemaining(info.minutesUntil);
            setLoading(false);
        }

        updateClassInfo();
        const interval = setInterval(updateClassInfo, 1000);
        return () => clearInterval(interval);
    }, [scheduleByDay]);

    if (loading) {
        return (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-zinc-800 rounded w-1/3 mb-3"></div>
                <div className="h-6 bg-zinc-800 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
            </div>
        );
    }

    if (!classInfo || classInfo.status === 'none') {
        return (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-3 text-zinc-500">
                    <Clock className="w-5 h-5" />
                    <span>No more classes today</span>
                </div>
            </div>
        );
    }

    const { status, currentClass, nextClass } = classInfo;
    const displayClass = status === 'current' ? currentClass : nextClass;
    const urgencyColor = getUrgencyColor(Math.floor(timeRemaining));
    const isUrgent = timeRemaining <= 30 && timeRemaining > 0;

    return (
        <div className={`
            relative overflow-hidden rounded-xl p-4 
            bg-gradient-to-br ${urgencyColor}
            shadow-lg transition-all duration-300
            ${isUrgent ? 'animate-pulse' : ''}
        `}>
            {/* Urgency indicator */}
            {isUrgent && (
                <div className="absolute top-2 right-2">
                    <span className="flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </span>
                </div>
            )}

            {/* Status Badge */}
            <div className="flex items-center gap-2 mb-3">
                {status === 'current' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 rounded-full text-xs font-medium text-white">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        In Progress
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 rounded-full text-xs font-medium text-white">
                        <Timer className="w-3 h-3" />
                        Coming Up
                    </span>
                )}
            </div>

            {/* Class Info */}
            <div className="space-y-2">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <span>{getClassTypeIcon(displayClass?.class_type || '')}</span>
                            {displayClass?.subject}
                        </h3>
                        <p className="text-white/80 text-sm">{displayClass?.class_type}</p>
                    </div>
                    
                    {/* Countdown */}
                    {status !== 'current' && (
                        <div className="text-right">
                            <p className="text-2xl font-bold text-white">
                                {formatTimeRemaining(Math.floor(timeRemaining))}
                            </p>
                            <p className="text-xs text-white/70">until class</p>
                        </div>
                    )}
                </div>

                {/* Details */}
                <div className="flex flex-wrap gap-3 pt-2 border-t border-white/20">
                    <div className="flex items-center gap-1 text-sm text-white/90">
                        <Clock className="w-4 h-4" />
                        <span>{displayClass?.time_start}:00 - {displayClass?.time_end}:00</span>
                    </div>
                    {displayClass?.room && (
                        <div className="flex items-center gap-1 text-sm text-white/90">
                            <MapPin className="w-4 h-4" />
                            <span>Room {displayClass.room}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Next class preview (when current is shown) */}
            {status === 'current' && nextClass && (
                <div className="mt-3 pt-3 border-t border-white/20">
                    <p className="text-xs text-white/70 mb-1">Up Next:</p>
                    <p className="text-sm text-white font-medium">
                        {getClassTypeIcon(nextClass.class_type)} {nextClass.subject} ({nextClass.class_type}) at {nextClass.time_start}:00
                    </p>
                </div>
            )}
        </div>
    );
}

// Compact version for header/sidebar
export function UpcomingClassBadge({ scheduleByDay }: UpcomingClassCardProps) {
    const [classInfo, setClassInfo] = useState<NextClassInfo | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<number>(0);

    useEffect(() => {
        function updateClassInfo() {
            const info = getClassInfoFromSchedule(scheduleByDay, new Date());
            setClassInfo(info);
            setTimeRemaining(info.minutesUntil);
        }
        updateClassInfo();
        const interval = setInterval(updateClassInfo, 1000);
        return () => clearInterval(interval);
    }, [scheduleByDay]);

    if (!classInfo || classInfo.status === 'none') return null;

    const isUrgent = timeRemaining <= 30 && timeRemaining > 0;
    const displayClass = classInfo.status === 'current' ? classInfo.currentClass : classInfo.nextClass;

    return (
        <div className={`
            inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
            ${classInfo.status === 'current' 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : isUrgent 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                    : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
            }
        `}>
            {classInfo.status === 'current' ? (
                <>
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <span className="font-medium">{displayClass?.subject}</span>
                    <span className="text-green-400/70">now</span>
                </>
            ) : (
                <>
                    <Timer className="w-4 h-4" />
                    <span className="font-medium">{displayClass?.subject}</span>
                    <span className={isUrgent ? 'text-red-400/70' : 'text-violet-400/70'}>
                        in {formatTimeRemaining(Math.floor(timeRemaining))}
                    </span>
                </>
            )}
        </div>
    );
}
