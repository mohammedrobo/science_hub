'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Sparkles, User, Bot, Paperclip, X, Plus, MessageCircle, ChevronLeft, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLessonStore } from '@/lib/store/lesson-store';
import { AnimatePresence, m } from 'framer-motion';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    image_urls?: string[];
    isStreaming?: boolean;
}

interface Session {
    id: string;
    title: string;
    created_at: string;
}

export function AIChat() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const lessonContext = useLessonStore();

    // Chat State
    const [sessions, setSessions] = useState<Session[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'init',
            role: 'assistant',
            content: "Greetings, Student. I am Da Vinci 2.0. Ready to unlock the secrets of the universe? 🌌",
        }
    ]);

    // Input State
    const [input, setInput] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load sessions on mount
    useEffect(() => {
        fetchSessions();
    }, []);

    // Load Messages when Session Changes
    useEffect(() => {
        if (currentSessionId) {
            setMessages([
                {
                    id: 'init-' + currentSessionId,
                    role: 'assistant',
                    content: "Resuming your previous session... 📜",
                }
            ]);
        } else {
            setMessages([
                {
                    id: 'init',
                    role: 'assistant',
                    content: `Greetings! I am Da Vinci 2.0. ${lessonContext.lessonTitle ? `\n\nI see you're studying **${lessonContext.lessonTitle}**. Ask me anything! ⚡` : 'How can I assist you today? 🌌'}`,
                }
            ]);
        }
    }, [currentSessionId, lessonContext.lessonTitle]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, previewUrls]);

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/chat/sessions');
            if (res.ok) {
                const data = await res.json();
                setSessions(data);
            }
        } catch (e) {
            console.error("Failed to fetch sessions", e);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles]);
            const newUrls = newFiles.map(file => URL.createObjectURL(file));
            setPreviewUrls(prev => [...prev, ...newUrls]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        URL.revokeObjectURL(previewUrls[index]);
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    setFiles(prev => [...prev, blob]);
                    setPreviewUrls(prev => [...prev, URL.createObjectURL(blob)]);
                }
            }
        }
    };

    const streamText = async (text: string, messageId: string) => {
        // Safety check for null/undefined text
        if (!text) {
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, content: 'Sorry, I received an empty response. Please try again.', isStreaming: false } : msg
            ));
            return;
        }
        const words = text.split('');
        let currentText = '';
        const chunkSize = 2;

        for (let i = 0; i < words.length; i += chunkSize) {
            currentText += words.slice(i, i + chunkSize).join('');
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, content: currentText, isStreaming: true } : msg
            ));
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, isStreaming: false } : msg
        ));
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if ((!input.trim() && files.length === 0) || isLoading) return;

        const tempFiles = [...files];
        const tempPreviews = [...previewUrls];
        const tempInput = input;

        setInput('');
        setFiles([]);
        setPreviewUrls([]);
        setIsLoading(true);

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: tempInput,
            image_urls: tempPreviews
        };

        setMessages(prev => [...prev, userMsg]);

        try {
            const base64Images = await Promise.all(tempFiles.map(async (file) => {
                return new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
            }));

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: tempInput,
                    sessionId: currentSessionId,
                    images: base64Images,
                    lessonContext: lessonContext.lessonId ? lessonContext : null
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            if (data.sessionId && data.sessionId !== currentSessionId) {
                setCurrentSessionId(data.sessionId);
                fetchSessions();
            }

            const botMsgId = (Date.now() + 1).toString();
            setMessages(prev => [...prev, {
                id: botMsgId,
                role: 'assistant',
                content: '',
                isStreaming: true
            }]);

            // Safeguard: Check if content is valid before streaming
            if (!data.content) {
                setMessages(prev => prev.map(msg =>
                    msg.id === botMsgId ? { ...msg, content: 'Error: Da Vinci received an empty response. All API keys may have exceeded their quota. Please try again later. ⚠️', isStreaming: false } : msg
                ));
            } else {
                await streamText(data.content, botMsgId);
            }

        } catch (error: any) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: `Error: ${error.message || "System Malfunction..."} ⚠️`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const startNewChat = () => {
        setCurrentSessionId(null);
        setMessages([
            {
                id: 'init-new',
                role: 'assistant',
                content: "New session started. What mysteries shall we explore? 🧠"
            }
        ]);
        setIsSidebarOpen(false);
    };

    return (
        <div className="flex h-[500px] sm:h-[600px] md:h-[700px] w-full max-w-5xl mx-auto border-2 border-indigo-500/30 rounded-xl bg-slate-950 overflow-hidden shadow-[0_0_40px_-5px_rgba(79,70,229,0.3)] relative">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(56,33,252,0.15),transparent_60%)] pointer-events-none" />

            {/* --- SIDEBAR (Desktop: visible, Mobile: overlay) --- */}
            {/* Desktop Sidebar */}
            <div className="hidden md:flex flex-col w-56 bg-slate-900/80 border-r border-indigo-500/20 flex-shrink-0 z-10">
                <div className="p-4 border-b border-indigo-500/20">
                    <button
                        onClick={startNewChat}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-lg p-2.5 text-sm font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" /> New Chat
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                    {sessions.length === 0 ? (
                        <div className="text-center py-6 text-indigo-400/50 text-xs px-2">
                            <p>No past sessions.</p>
                        </div>
                    ) : (
                        sessions.map(session => (
                            <button
                                key={session.id}
                                onClick={() => setCurrentSessionId(session.id)}
                                className={cn(
                                    "w-full text-left p-2 rounded-lg text-xs truncate transition-colors",
                                    currentSessionId === session.id
                                        ? "bg-indigo-600/30 text-indigo-100"
                                        : "text-indigo-300/70 hover:bg-indigo-500/10"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <MessageCircle className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{session.title || 'Untitled'}</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        <m.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="md:hidden fixed inset-0 bg-black/70 z-30"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                        <m.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="md:hidden fixed inset-y-0 left-0 w-64 bg-slate-900 z-40 flex flex-col shadow-2xl border-r border-indigo-500/20"
                        >
                            <div className="p-4 border-b border-indigo-500/20 flex items-center justify-between">
                                <h3 className="font-semibold text-indigo-100">History</h3>
                                <button onClick={() => setIsSidebarOpen(false)}>
                                    <ChevronLeft className="w-5 h-5 text-indigo-400" />
                                </button>
                            </div>
                            <div className="p-3">
                                <button
                                    onClick={startNewChat}
                                    className="w-full flex items-center justify-center gap-2 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-lg p-2.5 text-sm font-medium transition-colors"
                                >
                                    <Plus className="w-4 h-4" /> New Chat
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
                                {sessions.length === 0 ? (
                                    <div className="text-center py-8 text-indigo-400/50 text-xs px-4">
                                        <p>No past sessions.</p>
                                    </div>
                                ) : (
                                    sessions.map(session => (
                                        <button
                                            key={session.id}
                                            onClick={() => {
                                                setCurrentSessionId(session.id);
                                                setIsSidebarOpen(false);
                                            }}
                                            className={cn(
                                                "w-full text-left p-2.5 rounded-lg text-sm truncate transition-colors",
                                                currentSessionId === session.id
                                                    ? "bg-indigo-600/30 text-indigo-100"
                                                    : "text-indigo-300/70 hover:bg-indigo-500/10"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <MessageCircle className="w-3 h-3 shrink-0" />
                                                <span className="truncate">{session.title || 'Untitled'}</span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </m.div>
                    </>
                )}
            </AnimatePresence>

            {/* --- MAIN CHAT AREA --- */}
            <div className="flex-1 flex flex-col min-w-0 z-0">
                {/* Header */}
                <div className="p-4 border-b border-indigo-500/20 flex items-center gap-3 bg-slate-900/80 z-10 flex-shrink-0">
                    {/* Mobile Menu */}
                    <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-1.5 hover:bg-indigo-500/10 rounded-lg text-indigo-400">
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="p-2 bg-indigo-600/20 rounded-lg border border-indigo-500/30 shadow-[0_0_10px_rgba(79,70,229,0.3)]">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300 tracking-wide text-lg">
                            DA VINCI 2.0
                        </h3>
                        <p className="text-[10px] text-indigo-400/70 font-mono tracking-widest uppercase">
                            {lessonContext.lessonTitle ? `Studying: ${lessonContext.lessonTitle.substring(0, 25)}...` : 'Class S Assistant'}
                        </p>
                    </div>
                </div>

                {/* Messages */}
                <div
                    className="flex-1 p-4 sm:p-6 relative z-0 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-500/20 scrollbar-track-transparent"
                    ref={scrollRef}
                >
                    <div className="space-y-5 pb-4">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex gap-3 max-w-[90%] sm:max-w-[85%]",
                                    msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                                )}
                            >
                                <div className={cn(
                                    "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 border shadow-lg",
                                    msg.role === 'user'
                                        ? "bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-blue-500/20"
                                        : "bg-indigo-600/20 border-indigo-500/50 text-indigo-300 shadow-indigo-500/20"
                                )}>
                                    {msg.role === 'user' ? <User className="w-4 h-4 sm:w-5 sm:h-5" /> : <Bot className="w-4 h-4 sm:w-5 sm:h-5" />}
                                </div>

                                <div className={cn("flex flex-col gap-1.5", msg.role === 'user' ? 'items-end' : 'items-start')}>
                                    {msg.image_urls && msg.image_urls.map((url, i) => (
                                        <img
                                            key={i}
                                            src={url}
                                            alt="Attached"
                                            className="max-w-[150px] sm:max-w-[200px] rounded-lg border border-indigo-500/30"
                                        />
                                    ))}
                                    <div className={cn(
                                        "p-3 sm:p-4 rounded-2xl text-sm leading-relaxed shadow-md border prose prose-invert prose-sm prose-p:my-0.5 max-w-none",
                                        msg.role === 'user'
                                            ? "bg-blue-900/40 border-blue-500/20 text-blue-100 rounded-tr-sm"
                                            : "bg-indigo-900/40 border-indigo-500/20 text-indigo-100 rounded-tl-sm"
                                    )}>
                                        {msg.role === 'assistant' ? (
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.content}
                                            </ReactMarkdown>
                                        ) : (
                                            msg.content
                                        )}
                                        {msg.isStreaming && (
                                            <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-indigo-400 animate-pulse" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isLoading && !messages[messages.length - 1]?.isStreaming && (
                            <div className="flex gap-3 max-w-[85%]">
                                <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/50 text-indigo-300 flex items-center justify-center shrink-0 animate-pulse">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div className="flex items-center gap-1.5 p-4">
                                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Input */}
                <div className="p-3 sm:p-4 border-t border-indigo-500/20 bg-slate-900/80 z-10 flex-shrink-0">
                    {previewUrls.length > 0 && (
                        <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                            {previewUrls.map((url, i) => (
                                <div key={i} className="relative group shrink-0">
                                    <img src={url} alt="Preview" className="h-12 w-12 object-cover rounded-lg border border-indigo-500/30" />
                                    <button
                                        onClick={() => removeFile(i)}
                                        className="absolute -top-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-indigo-500/30 text-indigo-400 hover:text-red-400"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3 relative">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 sm:p-3 bg-slate-800/50 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 rounded-xl shrink-0"
                        >
                            <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/*"
                            multiple
                            className="hidden"
                        />
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                            onPaste={handlePaste}
                            placeholder="Ask Da Vinci... (Paste images supported)"
                            className={cn(
                                "flex-1 bg-slate-950/50 border border-indigo-500/30 text-indigo-100 placeholder:text-indigo-500/50",
                                "focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500",
                                "min-h-[44px] max-h-24 px-3 py-2 rounded-xl text-sm resize-none"
                            )}
                            rows={1}
                            disabled={isLoading}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={(!input.trim() && files.length === 0) || isLoading}
                            className={cn(
                                "h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)] transition-all shrink-0",
                                "disabled:opacity-50 disabled:shadow-none hover:scale-105 active:scale-95"
                            )}
                        >
                            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
