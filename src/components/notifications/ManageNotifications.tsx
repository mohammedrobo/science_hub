'use client';

import { useState, useEffect } from 'react';
import { getNotifications, deleteNotification, updateNotification } from '@/app/actions/notifications';
import type { Notification } from '@/types/notifications';
import { Trash2, Edit2, Save, X, Loader2, MoreHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ManageNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ title: '', message: '' });
    const [loading, setLoading] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        const data = await getNotifications();
        setNotifications(data);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this notification?")) return;

        setLoading(true);
        const result = await deleteNotification(id);
        if (result.success) {
            toast.success("Deleted successfully");
            setNotifications(prev => prev.filter(n => n.id !== id));
        } else {
            toast.error(result.error);
        }
        setLoading(false);
    };

    const startEdit = (n: Notification) => {
        setEditingId(n.id);
        setEditForm({ title: n.title, message: n.message });
    };

    const handleUpdate = async () => {
        if (!editingId) return;
        setLoading(true);
        const result = await updateNotification(editingId, editForm.title, editForm.message);
        if (result.success) {
            toast.success("Updated successfully");
            setNotifications(prev => prev.map(n => n.id === editingId ? { ...n, ...editForm } : n));
            setEditingId(null);
        } else {
            toast.error(result.error);
        }
        setLoading(false);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-400">Recent Notifications</h3>
                <Button variant="ghost" size="sm" onClick={loadNotifications} className="h-6 text-xs">
                    Refresh
                </Button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {notifications.length === 0 ? (
                    <p className="text-center text-zinc-600 text-xs py-4">No notifications found</p>
                ) : (
                    notifications.map(n => (
                        <div key={n.id} className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3 group">
                            {editingId === n.id ? (
                                <div className="space-y-2">
                                    <input
                                        value={editForm.title}
                                        onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
                                        placeholder="Title"
                                    />
                                    <textarea
                                        value={editForm.message}
                                        onChange={e => setEditForm(prev => ({ ...prev, message: e.target.value }))}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white resize-y min-h-[60px]"
                                        placeholder="Message"
                                        rows={4}
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} disabled={loading}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                        <Button size="sm" onClick={handleUpdate} disabled={loading}>
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0 mr-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-sm text-zinc-200 truncate">{n.title}</span>
                                            <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-400 whitespace-pre-wrap break-words leading-relaxed">
                                            {expandedIds.has(n.id) || n.message.length <= 100
                                                ? n.message
                                                : n.message.slice(0, 100) + '...'}
                                        </p>
                                        {n.message.length > 100 && (
                                            <button
                                                onClick={() => toggleExpand(n.id)}
                                                className="mt-0.5 text-[10px] text-primary/70 hover:text-primary flex items-center gap-0.5"
                                            >
                                                {expandedIds.has(n.id) ? (
                                                    <><ChevronUp className="w-3 h-3" /> Less</>
                                                ) : (
                                                    <><ChevronDown className="w-3 h-3" /> More</>
                                                )}
                                            </button>
                                        )}
                                        <div className="mt-1 flex gap-2">
                                            {n.target_section && (
                                                <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-1 rounded text-zinc-500">
                                                    To: {n.target_section}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                                            <DropdownMenuItem onClick={() => startEdit(n)} className="text-xs">
                                                <Edit2 className="w-3 h-3 mr-2" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDelete(n.id)} className="text-xs text-red-400 hover:text-red-300">
                                                <Trash2 className="w-3 h-3 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
