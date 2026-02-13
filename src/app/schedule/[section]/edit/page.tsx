'use client';

import { useState, useEffect, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSchedulePageData, updateScheduleEntry, deleteScheduleEntries, type ScheduleEntry } from '../../actions';
import { ArrowLeft, Save, Plus, Trash2, Loader2, Home } from 'lucide-react';
import Link from 'next/link';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
const DAY_LABELS: Record<string, string> = {
    sunday: 'الأحد',
    monday: 'الإثنين',
    tuesday: 'الثلاثاء',
    wednesday: 'الأربعاء',
    thursday: 'الخميس'
};

const SUBJECTS = ['Physics', 'Chemistry', 'Zoology', 'Botany', 'Math', 'Computer', 'Geology'];
const CLASS_TYPES = ['Lecture', 'Practical', 'Tutorial'];

export default function ScheduleEditPage() {
    const params = useParams();
    const router = useRouter();
    const sectionId = (params.section as string).toUpperCase();

    const [schedule, setSchedule] = useState<Record<string, ScheduleEntry[]>>({});
    const [activeDay, setActiveDay] = useState('sunday');
    const [canEdit, setCanEdit] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        async function fetchData() {
            setLoading(true);

            // OPTIMIZED: Single call gets schedule + permissions
            const { schedule: scheduleData, canEdit: hasPermission } = await getSchedulePageData(sectionId);

            if (!hasPermission) {
                router.push(`/schedule/${sectionId.toLowerCase()}`);
                return;
            }

            setSchedule(scheduleData);
            setCanEdit(hasPermission);
            setLoading(false);
        }
        fetchData();
    }, [sectionId, router]);

    const todaySchedule = schedule[activeDay] || [];

    const handleEntryChange = (index: number, field: keyof ScheduleEntry, value: string | number) => {
        setSchedule(prev => {
            const updated = { ...prev };
            if (!updated[activeDay]) updated[activeDay] = [];
            updated[activeDay] = [...updated[activeDay]];
            updated[activeDay][index] = { ...updated[activeDay][index], [field]: value };
            return updated;
        });
    };

    const addEntry = () => {
        setSchedule(prev => {
            const updated = { ...prev };
            if (!updated[activeDay]) updated[activeDay] = [];
            updated[activeDay] = [...updated[activeDay], {
                section_id: sectionId,
                day_of_week: activeDay,
                slot_order: updated[activeDay].length + 1,
                subject: 'Physics',
                class_type: 'Lecture',
                room: '',
                time_start: '8',
                time_end: '10'
            }];
            return updated;
        });
    };

    const removeEntry = (index: number) => {
        setSchedule(prev => {
            const updated = { ...prev };
            const entryToRemove = updated[activeDay][index];

            // If entry has an ID (exists in DB), mark for deletion
            if (entryToRemove.id) {
                setDeletedIds(prevIds => {
                    const newIds = new Set(prevIds);
                    newIds.add(entryToRemove.id!);
                    return newIds;
                });
            }

            updated[activeDay] = updated[activeDay].filter((_, i) => i !== index);
            return updated;
        });
    };

    const saveChanges = async () => {
        setSaving(true);
        setMessage(null);

        try {
            // 1. Process deletions first
            if (deletedIds.size > 0) {
                const deleteResult = await deleteScheduleEntries(Array.from(deletedIds), sectionId);
                if (deleteResult.error) {
                    setMessage({ type: 'error', text: deleteResult.error });
                    setSaving(false);
                    return;
                }
                // Clear deleted IDs on success
                setDeletedIds(new Set());
            }

            // 2. Save all entries for the current day
            for (const entry of schedule[activeDay] || []) {
                const result = await updateScheduleEntry(entry);
                if (result.error) {
                    setMessage({ type: 'error', text: result.error });
                    setSaving(false);
                    return;
                }
            }
            setMessage({ type: 'success', text: 'Changes saved successfully!' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to save changes' });
        }

        setSaving(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    if (!canEdit) {
        return null; // Will redirect
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4 md:p-8">
            {/* Header */}
            <div className="max-w-4xl mx-auto mb-8">
                <div className="flex items-center gap-4 mb-4">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <Home size={20} />
                        <span>Home</span>
                    </Link>
                    <span className="text-gray-600">|</span>
                    <Link
                        href={`/schedule/${sectionId.toLowerCase()}`}
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span>Back to Schedule</span>
                    </Link>
                </div>

                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
                        Edit Schedule - {sectionId}
                    </h1>

                    <button
                        onClick={saveChanges}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        <span>Save</span>
                    </button>
                </div>

                {message && (
                    <div className={`mt-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
                        {message.text}
                    </div>
                )}
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

            {/* Editable Entries */}
            <div className="max-w-4xl mx-auto space-y-4">
                {todaySchedule.map((entry, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Subject</label>
                                <select
                                    value={entry.subject}
                                    onChange={(e) => handleEntryChange(idx, 'subject', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-3 text-white"
                                >
                                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Type</label>
                                <select
                                    value={entry.class_type}
                                    onChange={(e) => handleEntryChange(idx, 'class_type', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-3 text-white"
                                >
                                    {CLASS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Room</label>
                                <input
                                    type="text"
                                    value={entry.room || ''}
                                    onChange={(e) => handleEntryChange(idx, 'room', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-3 text-white"
                                    placeholder="e.g., C104"
                                />
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-400 mb-1 block">Start</label>
                                    <input
                                        type="text"
                                        value={entry.time_start || ''}
                                        onChange={(e) => handleEntryChange(idx, 'time_start', e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-3 text-white"
                                        placeholder="8"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-gray-400 mb-1 block">End</label>
                                    <input
                                        type="text"
                                        value={entry.time_end || ''}
                                        onChange={(e) => handleEntryChange(idx, 'time_end', e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-3 text-white"
                                        placeholder="10"
                                    />
                                </div>
                                <button
                                    onClick={() => removeEntry(idx)}
                                    className="self-end p-3 text-red-400 hover:bg-red-600/20 rounded-lg transition-colors ml-2"
                                    title="Remove Class"
                                >
                                    <Trash2 size={22} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                <button
                    onClick={addEntry}
                    className="w-full p-4 border-2 border-dashed border-gray-600 rounded-xl text-gray-400 hover:text-white hover:border-violet-500 flex items-center justify-center gap-2 transition-colors"
                >
                    <Plus size={20} />
                    <span>Add Class</span>
                </button>
            </div>
        </div>
    );
}
