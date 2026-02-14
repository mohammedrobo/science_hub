'use client';

import type { HeatmapCell } from '@/lib/safety/analytics';

interface ActivityHeatmapProps {
    data: HeatmapCell[];
    title?: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function ActivityHeatmap({ data, title = 'Activity Heatmap' }: ActivityHeatmapProps) {
    const maxCount = Math.max(...data.map(d => d.count), 1);

    const getColor = (count: number) => {
        if (count === 0) return 'bg-zinc-900';
        const intensity = count / maxCount;
        if (intensity > 0.75) return 'bg-emerald-500';
        if (intensity > 0.5) return 'bg-emerald-600/80';
        if (intensity > 0.25) return 'bg-emerald-700/60';
        return 'bg-emerald-800/40';
    };

    const getCell = (day: number, hour: number) =>
        data.find(d => d.day === day && d.hour === hour);

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-300">{title}</h3>
            <div className="overflow-x-auto">
                <div className="min-w-[500px]">
                    {/* Hour labels */}
                    <div className="flex gap-[2px] mb-1 ml-10">
                        {HOURS.map(h => (
                            <div key={h} className="w-[18px] text-center text-[8px] text-zinc-600">
                                {h % 3 === 0 ? `${h}` : ''}
                            </div>
                        ))}
                    </div>
                    {/* Grid rows */}
                    {DAYS.map((dayName, dayIdx) => (
                        <div key={dayName} className="flex items-center gap-[2px] mb-[2px]">
                            <span className="w-8 text-[10px] text-zinc-500 text-right mr-1.5 shrink-0">{dayName}</span>
                            {HOURS.map(hour => {
                                const cell = getCell(dayIdx, hour);
                                const count = cell?.count || 0;
                                return (
                                    <div
                                        key={hour}
                                        className={`w-[18px] h-[18px] rounded-sm ${getColor(count)} transition-colors cursor-default`}
                                        title={`${dayName} ${hour}:00 — ${count} actions`}
                                    />
                                );
                            })}
                        </div>
                    ))}
                    {/* Legend */}
                    <div className="flex items-center gap-2 mt-3 ml-10">
                        <span className="text-[10px] text-zinc-500">Less</span>
                        <div className="w-3 h-3 rounded-sm bg-zinc-900" />
                        <div className="w-3 h-3 rounded-sm bg-emerald-800/40" />
                        <div className="w-3 h-3 rounded-sm bg-emerald-700/60" />
                        <div className="w-3 h-3 rounded-sm bg-emerald-600/80" />
                        <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                        <span className="text-[10px] text-zinc-500">More</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
