import Link from 'next/link';
import { Calendar, Users } from 'lucide-react';

const SECTIONS = [
    { group: 'A', sections: ['A1', 'A2', 'A3', 'A4'], color: 'from-blue-500 to-blue-600' },
    { group: 'B', sections: ['B1', 'B2', 'B3', 'B4'], color: 'from-green-500 to-green-600' },
    { group: 'C', sections: ['C1', 'C2', 'C3', 'C4'], color: 'from-purple-500 to-purple-600' },
    { group: 'D', sections: ['D1', 'D2', 'D3', 'D4'], color: 'from-orange-500 to-orange-600' }
];

export default function ScheduleIndexPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-600/20 mb-4">
                        <Calendar size={32} className="text-violet-400" />
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent mb-2">
                        Section Schedules
                    </h1>
                    <p className="text-gray-400">Select your section to view the weekly schedule</p>
                </div>

                {/* Section Grid */}
                <div className="space-y-8">
                    {SECTIONS.map(({ group, sections, color }) => (
                        <div key={group}>
                            <h2 className="text-xl font-semibold text-gray-300 mb-4 flex items-center gap-2">
                                <Users size={20} />
                                Group {group}
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {sections.map(section => (
                                    <Link
                                        key={section}
                                        href={`/schedule/${section.toLowerCase()}`}
                                        className={`
                                            relative p-6 rounded-xl bg-gradient-to-br ${color}
                                            hover:scale-105 transition-transform
                                            flex flex-col items-center justify-center
                                            shadow-lg hover:shadow-xl
                                        `}
                                    >
                                        <span className="text-3xl font-bold text-white">{section}</span>
                                        <span className="text-sm text-white/70 mt-1">View Schedule</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
