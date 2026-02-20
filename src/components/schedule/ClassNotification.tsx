'use client';

import { useState, useEffect } from 'react';
import { getCurrentClass, type ScheduleEntry } from '@/app/schedule/actions';
import { Bell, BookOpen, Clock } from 'lucide-react';

interface ClassNotificationProps {
    sectionId: string;
}

export default function ClassNotification({ sectionId }: ClassNotificationProps) {
    const [status, setStatus] = useState<'current' | 'next' | 'none'>('none');
    const [classInfo, setClassInfo] = useState<ScheduleEntry | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCurrentClass() {
            const result = await getCurrentClass(sectionId);
            setStatus(result.status as 'current' | 'next' | 'none');
            setClassInfo(result.class);
            setLoading(false);
        }

        fetchCurrentClass();

        // Refresh every minute
        const interval = setInterval(fetchCurrentClass, 60000);
        return () => clearInterval(interval);
    }, [sectionId]);

    if (loading || status === 'none') return null;

    const isCurrent = status === 'current';

    return (
        <div className={`
            fixed bottom-4 end-4 start-4 sm:start-auto sm:max-w-sm p-4 rounded-xl shadow-lg
            ${isCurrent
                ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                : 'bg-gradient-to-r from-violet-600 to-purple-600'
            }
            animate-in slide-in-from-bottom-5 duration-300
        `}>
            <div className="flex items-start gap-3">
                <div className={`
                    p-2 rounded-lg
                    ${isCurrent ? 'bg-green-500/30' : 'bg-violet-500/30'}
                `}>
                    {isCurrent ? <BookOpen size={20} /> : <Bell size={20} />}
                </div>

                <div className="flex-1">
                    <p className="text-sm font-medium text-white/80">
                        {isCurrent ? 'Currently in class' : 'Next class'}
                    </p>
                    <h3 className="text-lg font-bold text-white">
                        {classInfo?.subject} ({classInfo?.class_type})
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-white/70 mt-1">
                        <Clock size={14} />
                        <span>
                            {classInfo?.time_start}:00 - {classInfo?.time_end}:00
                        </span>
                        {classInfo?.room && (
                            <span className="ml-2">• Room {classInfo.room}</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
