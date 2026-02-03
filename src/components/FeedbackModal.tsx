'use client';

import { useState } from 'react';
import { Bug, Lightbulb, HelpCircle, MessageSquare, Send, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const feedbackTypes = [
    { id: 'bug', label: 'Report a Bug', icon: Bug, color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/30' },
    { id: 'idea', label: 'Share an Idea', icon: Lightbulb, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/30' },
    { id: 'question', label: 'Ask a Question', icon: HelpCircle, color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/30' },
    { id: 'other', label: 'Other Feedback', icon: MessageSquare, color: 'text-zinc-400', bgColor: 'bg-zinc-500/10 border-zinc-500/30' },
];

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
    const [step, setStep] = useState<'type' | 'form'>('type');
    const [selectedType, setSelectedType] = useState<string>('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const handleTypeSelect = (type: string) => {
        setSelectedType(type);
        setStep('form');
    };

    const handleSubmit = async () => {
        if (!title.trim() || !description.trim()) {
            toast.error('Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: selectedType,
                    title: title.trim(),
                    description: description.trim(),
                    pageUrl: window.location.href
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit');
            }

            toast.success('Thank you! Your feedback has been submitted.', {
                duration: 5000
            });

            // Reset and close
            setStep('type');
            setSelectedType('');
            setTitle('');
            setDescription('');
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to submit feedback');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setStep('type');
        setSelectedType('');
    };

    const handleClose = () => {
        setStep('type');
        setSelectedType('');
        setTitle('');
        setDescription('');
        onClose();
    };

    if (!isOpen) return null;

    const selectedTypeInfo = feedbackTypes.find(t => t.id === selectedType);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <h2 className="text-lg font-semibold text-white">
                        {step === 'type' ? '💬 Send Feedback' : `${selectedTypeInfo?.label}`}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="p-1 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    {step === 'type' ? (
                        <div className="space-y-3">
                            <p className="text-sm text-zinc-400 mb-4">
                                What would you like to share with us?
                            </p>
                            {feedbackTypes.map(type => {
                                const Icon = type.icon;
                                return (
                                    <button
                                        key={type.id}
                                        onClick={() => handleTypeSelect(type.id)}
                                        className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all hover:scale-[1.02] ${type.bgColor}`}
                                    >
                                        <Icon className={`w-5 h-5 ${type.color}`} />
                                        <span className="text-white font-medium">{type.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={
                                        selectedType === 'bug' 
                                            ? "e.g., Button doesn't work on schedule page"
                                            : selectedType === 'idea'
                                            ? "e.g., Add dark mode toggle"
                                            : "Brief summary..."
                                    }
                                    maxLength={200}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                />
                                <p className="text-xs text-zinc-500 mt-1 text-right">
                                    {title.length}/200
                                </p>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder={
                                        selectedType === 'bug'
                                            ? "Please describe what happened, what you expected, and any steps to reproduce the issue..."
                                            : selectedType === 'idea'
                                            ? "Tell us more about your idea and how it would help..."
                                            : "Provide more details..."
                                    }
                                    maxLength={5000}
                                    rows={5}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                                />
                                <p className="text-xs text-zinc-500 mt-1 text-right">
                                    {description.length}/5000
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={handleBack}
                                    className="flex-1"
                                    disabled={loading}
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={loading || !title.trim() || !description.trim()}
                                    className="flex-1 bg-violet-600 hover:bg-violet-700"
                                >
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <Send className="w-4 h-4 mr-2" />
                                    )}
                                    Submit
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 bg-zinc-800/50 border-t border-zinc-800">
                    <p className="text-xs text-zinc-500 text-center">
                        Your feedback helps us improve Science Hub! 🚀
                    </p>
                </div>
            </div>
        </div>
    );
}
