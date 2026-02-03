'use client';

import { useState, useEffect } from 'react';
import { Bug, Lightbulb, HelpCircle, MessageSquare, Clock, User, Globe, CheckCircle, XCircle, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Feedback {
    id: string;
    username: string;
    section: string;
    type: 'bug' | 'idea' | 'question' | 'other';
    title: string;
    description: string;
    page_url: string;
    user_agent: string;
    status: 'new' | 'reviewing' | 'in-progress' | 'resolved' | 'wont-fix';
    admin_notes: string;
    created_at: string;
}

const typeConfig = {
    bug: { icon: Bug, color: 'text-red-400', bg: 'bg-red-500/10' },
    idea: { icon: Lightbulb, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    question: { icon: HelpCircle, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    other: { icon: MessageSquare, color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
};

const statusConfig = {
    new: { label: 'New', color: 'text-violet-400', bg: 'bg-violet-500/20' },
    reviewing: { label: 'Reviewing', color: 'text-blue-400', bg: 'bg-blue-500/20' },
    'in-progress': { label: 'In Progress', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
    resolved: { label: 'Resolved', color: 'text-green-400', bg: 'bg-green-500/20' },
    'wont-fix': { label: "Won't Fix", color: 'text-zinc-400', bg: 'bg-zinc-500/20' },
};

export function FeedbackList() {
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<{ type?: string; status?: string }>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchFeedback = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter.type) params.set('type', filter.type);
            if (filter.status) params.set('status', filter.status);

            const response = await fetch(`/api/feedback?${params}`);
            const data = await response.json();
            
            if (response.ok) {
                setFeedback(data.feedback);
            } else {
                toast.error(data.error);
            }
        } catch (error) {
            toast.error('Failed to fetch feedback');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedback();
    }, [filter]);

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const response = await fetch(`/api/feedback/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                setFeedback(prev => prev.map(f => 
                    f.id === id ? { ...f, status: newStatus as any } : f
                ));
                toast.success('Status updated');
            } else {
                toast.error('Failed to update');
            }
        } catch (error) {
            toast.error('Failed to update');
        }
    };

    const deleteFeedback = async (id: string) => {
        if (!confirm('Are you sure you want to delete this feedback?')) return;

        try {
            const response = await fetch(`/api/feedback/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setFeedback(prev => prev.filter(f => f.id !== id));
                toast.success('Feedback deleted');
            } else {
                toast.error('Failed to delete');
            }
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex gap-2">
                    <select
                        value={filter.type || ''}
                        onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value || undefined }))}
                        className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                    >
                        <option value="">All Types</option>
                        <option value="bug">Bugs</option>
                        <option value="idea">Ideas</option>
                        <option value="question">Questions</option>
                        <option value="other">Other</option>
                    </select>

                    <select
                        value={filter.status || ''}
                        onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value || undefined }))}
                        className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                    >
                        <option value="">All Status</option>
                        <option value="new">New</option>
                        <option value="reviewing">Reviewing</option>
                        <option value="in-progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="wont-fix">Won't Fix</option>
                    </select>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchFeedback}
                    disabled={loading}
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>

                <div className="ml-auto text-sm text-zinc-400">
                    {feedback.length} items
                </div>
            </div>

            {/* Feedback List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                </div>
            ) : feedback.length === 0 ? (
                <div className="text-center py-12 text-zinc-400">
                    No feedback found
                </div>
            ) : (
                <div className="space-y-4">
                    {feedback.map((item) => {
                        const typeInfo = typeConfig[item.type];
                        const statusInfo = statusConfig[item.status];
                        const Icon = typeInfo.icon;
                        const isExpanded = expandedId === item.id;

                        return (
                            <div
                                key={item.id}
                                className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden"
                            >
                                {/* Header */}
                                <div
                                    className="p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-lg ${typeInfo.bg}`}>
                                            <Icon className={`w-5 h-5 ${typeInfo.color}`} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-medium text-white truncate">
                                                    {item.title}
                                                </h3>
                                                <span className={`px-2 py-0.5 rounded-full text-xs ${statusInfo.bg} ${statusInfo.color}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-4 text-sm text-zinc-400">
                                                <span className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    {item.username}
                                                    {item.section && ` (${item.section})`}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDate(item.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 border-t border-zinc-800 pt-4">
                                        {/* Description */}
                                        <div className="mb-4">
                                            <h4 className="text-sm font-medium text-zinc-300 mb-2">Description</h4>
                                            <p className="text-zinc-400 whitespace-pre-wrap text-sm">
                                                {item.description}
                                            </p>
                                        </div>

                                        {/* Meta Info */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                                            {item.page_url && (
                                                <div>
                                                    <span className="text-zinc-500">Page: </span>
                                                    <span className="text-zinc-300">{item.page_url}</span>
                                                </div>
                                            )}
                                            {item.user_agent && (
                                                <div>
                                                    <span className="text-zinc-500">Browser: </span>
                                                    <span className="text-zinc-300 truncate">{item.user_agent.substring(0, 50)}...</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-wrap gap-2">
                                            <select
                                                value={item.status}
                                                onChange={(e) => updateStatus(item.id, e.target.value)}
                                                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                            >
                                                <option value="new">New</option>
                                                <option value="reviewing">Reviewing</option>
                                                <option value="in-progress">In Progress</option>
                                                <option value="resolved">Resolved</option>
                                                <option value="wont-fix">Won't Fix</option>
                                            </select>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => deleteFeedback(item.id)}
                                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                            >
                                                <Trash2 className="w-4 h-4 mr-1" />
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
