'use client';

import { useState } from 'react';
import { sendNotification } from '@/app/actions/notifications';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SendNotificationFormProps {
    role: 'super_admin' | 'admin' | 'leader';
    userSection?: string | null; // Required for leader
}

export function SendNotificationForm({ role, userSection }: SendNotificationFormProps) {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [target, setTarget] = useState<string>('all');
    const [sending, setSending] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) return;

        setSending(true);

        const targetSection = (role === 'super_admin' || role === 'admin')
            ? (target === 'all' ? null : target) // Admin/Super Admin can pick
            : userSection; // Leader forces their section

        const result = await sendNotification(title, message, targetSection || null);

        if (result.success) {
            toast.success("Notification sent!");
            setTitle('');
            setMessage('');
            setTarget('all');
        } else {
            toast.error(result.error || "Failed to send");
        }

        setSending(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <h3 className="font-semibold text-lg flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" />
                Send Notification
            </h3>

            <div className="space-y-3">
                {/* Target Selector (Admin / Super Admin) */}
                {(role === 'super_admin' || role === 'admin') && (
                    <div className="space-y-1">
                        <label className="text-xs text-zinc-400">Target Audience</label>
                        <select
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                        >
                            <option value="all">Everyone (All Batch)</option>
                            <optgroup label="Groups">
                                <option value="group_A">Group A (All A Sections)</option>
                                <option value="group_B">Group B (All B Sections)</option>
                                <option value="group_C">Group C (All C Sections)</option>
                                <option value="group_D">Group D (All D Sections)</option>
                            </optgroup>
                            <optgroup label="Group A Sections">
                                <option value="A1">Section A1</option>
                                <option value="A2">Section A2</option>
                                <option value="A3">Section A3</option>
                                <option value="A4">Section A4</option>
                            </optgroup>
                            <optgroup label="Group B Sections">
                                <option value="B1">Section B1</option>
                                <option value="B2">Section B2</option>
                                <option value="B3">Section B3</option>
                                <option value="B4">Section B4</option>
                            </optgroup>
                            <optgroup label="Group C Sections">
                                <option value="C1">Section C1</option>
                                <option value="C2">Section C2</option>
                                <option value="C3">Section C3</option>
                                <option value="C4">Section C4</option>
                            </optgroup>
                            <optgroup label="Group D Sections">
                                <option value="D1">Section D1</option>
                                <option value="D2">Section D2</option>
                                <option value="D3">Section D3</option>
                                <option value="D4">Section D4</option>
                            </optgroup>
                        </select>
                    </div>
                )}

                {/* Leader View (Informational) */}
                {role === 'leader' && (
                    <div className="text-sm text-zinc-500 bg-zinc-950/50 p-2 rounded border border-zinc-800">
                        Sending to: <span className="text-primary font-bold">{userSection}</span>
                    </div>
                )}

                <div className="space-y-1">
                    <input
                        type="text"
                        placeholder="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                    />
                </div>

                <div className="space-y-1">
                    <textarea
                        placeholder="Message content... (supports long announcements with multiple lines)"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={5}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none resize-y min-h-[100px]"
                    />
                    <div className="flex justify-end">
                        <span className={`text-[10px] ${message.length > 500 ? 'text-amber-400' : 'text-zinc-600'}`}>
                            {message.length} characters
                        </span>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={sending}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Blast
                </button>
            </div>
        </form>
    );
}
