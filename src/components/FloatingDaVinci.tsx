'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Paperclip, Plus, MessageCircle, ChevronLeft, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AnimatePresence, m } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLessonStore } from '@/lib/store/lesson-store';

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

export function FloatingDaVinci() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Global Context
    const lessonContext = useLessonStore();

    // Chat State
    const [sessions, setSessions] = useState<Session[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);

    // Input State
    const [input, setInput] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Load - Fetch Sessions
    useEffect(() => {
        if (isOpen) {
            fetchSessions();
        }
    }, [isOpen]);

    // Load Messages when Session Changes
    useEffect(() => {
        if (currentSessionId) {
            setMessages([
                {
                    id: 'init-' + currentSessionId,
                    role: 'assistant',
                    content: "Welcome back! 📜",
                }
            ]);
        } else {
            setMessages([
                {
                    id: 'init',
                    role: 'assistant',
                    content: `How can I assist you today? ${lessonContext.lessonTitle ? `\n\nI see you are studying **${lessonContext.lessonTitle}**. Ask me anything about it! ⚡` : ''}`,
                }
            ]);
        }
    }, [currentSessionId, lessonContext.lessonTitle]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen, previewUrls]);

    // Hide on specific pages
    if (pathname === '/login' || pathname === '/change-password' || pathname?.startsWith('/guild')) {
        return null;
    }

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
        const chunkSize = 3;

        for (let i = 0; i < words.length; i += chunkSize) {
            currentText += words.slice(i, i + chunkSize).join('');
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, content: currentText, isStreaming: true } : msg
            ));
            await new Promise(resolve => setTimeout(resolve, 5));
        }
        setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, isStreaming: false } : msg
        ));
    };

    const handleSubmit = async () => {
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
                content: `Error: ${error.message || "Something went wrong."}`
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
                content: "Started a new conversation. What's on your mind? 🧠"
            }
        ]);
        setIsSidebarOpen(false);
    };

    return (
        <>
            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <m.div
                        initial={{ opacity: 0, scale: 0.98, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 5 }}
                        transition={{ duration: 0.1, ease: 'easeOut' }}
                        className="fixed bottom-20 sm:bottom-24 right-3 sm:right-6 w-[calc(100%-1.5rem)] sm:w-[420px] md:w-[700px] h-[70vh] sm:h-[550px] max-h-[750px] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 origin-bottom-right"
                    >
                        {/* Main Flex Container - Desktop shows sidebar, Mobile hides it */}
                        <div className="flex h-full">
                            {/* --- SIDEBAR (Desktop: always visible, Mobile: overlay) --- */}
                            {/* Desktop Sidebar (always visible) */}
                            <div className="hidden md:flex flex-col w-52 bg-zinc-900 border-r border-zinc-800 flex-shrink-0">
                                <div className="p-3 border-b border-zinc-800">
                                    <button
                                        onClick={startNewChat}
                                        className="w-full flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-lg p-2.5 text-sm font-medium transition-colors"
                                    >
                                        <Plus className="w-4 h-4" /> New Chat
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                                    {sessions.length === 0 ? (
                                        <div className="text-center py-6 text-zinc-500 text-xs px-2">
                                            <p>No past chats.</p>
                                        </div>
                                    ) : (
                                        sessions.map(session => (
                                            <button
                                                key={session.id}
                                                onClick={() => setCurrentSessionId(session.id)}
                                                className={cn(
                                                    "w-full text-left p-2 rounded-lg text-xs truncate transition-colors",
                                                    currentSessionId === session.id
                                                        ? "bg-zinc-800 text-white"
                                                        : "text-zinc-400 hover:bg-zinc-800/50"
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
                                        {/* Backdrop */}
                                        <m.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="md:hidden fixed inset-0 bg-black/60 z-30"
                                            onClick={() => setIsSidebarOpen(false)}
                                        />
                                        {/* Sidebar */}
                                        <m.div
                                            initial={{ x: '-100%' }}
                                            animate={{ x: 0 }}
                                            exit={{ x: '-100%' }}
                                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                            className="md:hidden fixed inset-y-0 left-0 w-64 bg-zinc-900 z-40 flex flex-col shadow-2xl"
                                        >
                                            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                                                <h3 className="font-semibold text-white">History</h3>
                                                <button onClick={() => setIsSidebarOpen(false)}>
                                                    <ChevronLeft className="w-5 h-5 text-zinc-400" />
                                                </button>
                                            </div>
                                            <div className="p-3">
                                                <button
                                                    onClick={startNewChat}
                                                    className="w-full flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-lg p-2.5 text-sm font-medium transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" /> New Chat
                                                </button>
                                            </div>
                                            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
                                                {sessions.length === 0 ? (
                                                    <div className="text-center py-8 text-zinc-500 text-xs px-4">
                                                        <p>No past chats found.</p>
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
                                                                    ? "bg-zinc-800 text-white"
                                                                    : "text-zinc-400 hover:bg-zinc-800/50"
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
                            <div className="flex-1 flex flex-col min-w-0">
                                {/* Header */}
                                <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-3 bg-zinc-950/80 backdrop-blur-sm flex-shrink-0">
                                    <div className="flex items-center gap-2">
                                        {/* Mobile Menu Button */}
                                        <button
                                            onClick={() => setIsSidebarOpen(true)}
                                            className="md:hidden p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400"
                                        >
                                            <Menu className="w-5 h-5" />
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center">
                                                <Bot className="w-3.5 h-3.5 text-white" />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-white text-sm block leading-tight">Da Vinci</span>
                                                {lessonContext.lessonTitle && (
                                                    <span className="text-[9px] text-zinc-500">
                                                        {lessonContext.lessonTitle.substring(0, 20)}...
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-3 space-y-4" ref={scrollRef}>
                                    {messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                "flex gap-2 max-w-full",
                                                msg.role === 'user' ? "flex-row-reverse" : ""
                                            )}
                                        >
                                            <div className={cn(
                                                "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs",
                                                msg.role === 'user'
                                                    ? "bg-zinc-800 text-zinc-300"
                                                    : "bg-primary/20 text-primary"
                                            )}>
                                                {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                                            </div>

                                            <div className={cn(
                                                "flex flex-col gap-1 max-w-[85%]",
                                                msg.role === 'user' ? "items-end" : "items-start"
                                            )}>
                                                {msg.image_urls && msg.image_urls.map((url, i) => (
                                                    <img
                                                        key={i}
                                                        src={url}
                                                        alt="Attached"
                                                        className="max-w-[150px] rounded-lg border border-zinc-700"
                                                    />
                                                ))}

                                                <div className={cn(
                                                    "px-3 py-2 rounded-xl text-sm leading-relaxed prose prose-invert prose-sm prose-p:my-0.5 max-w-none",
                                                    msg.role === 'user'
                                                        ? "bg-zinc-800 text-zinc-100 rounded-tr-none"
                                                        : "bg-zinc-900 text-zinc-100 rounded-tl-none border border-zinc-800"
                                                )}>
                                                    {msg.role === 'assistant' ? (
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {msg.content}
                                                        </ReactMarkdown>
                                                    ) : (
                                                        msg.content
                                                    )}
                                                    {msg.isStreaming && <span className="inline-block w-1 h-3 ml-0.5 bg-primary animate-pulse" />}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {isLoading && !messages[messages.length - 1]?.isStreaming && (
                                        <div className="flex gap-2">
                                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                                                <Bot className="w-3.5 h-3.5 text-primary" />
                                            </div>
                                            <div className="flex items-center gap-1 p-2 bg-zinc-900 rounded-xl rounded-tl-none border border-zinc-800">
                                                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" />
                                                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Input Area */}
                                <div className="p-3 border-t border-zinc-800 bg-zinc-950 flex-shrink-0">
                                    {previewUrls.length > 0 && (
                                        <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                                            {previewUrls.map((url, i) => (
                                                <div key={i} className="relative group shrink-0">
                                                    <img src={url} alt="Preview" className="h-12 w-12 object-cover rounded-lg border border-zinc-700" />
                                                    <button
                                                        onClick={() => removeFile(i)}
                                                        className="absolute -top-1 -right-1 bg-zinc-900 rounded-full p-0.5 border border-zinc-700 text-zinc-400 hover:text-red-400"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex items-end gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-1.5">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg shrink-0"
                                        >
                                            <Paperclip className="w-4 h-4" />
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
                                            placeholder="Ask Da Vinci..."
                                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-2 text-white placeholder-zinc-500 resize-none max-h-24 min-h-[36px]"
                                            rows={1}
                                        />

                                        <button
                                            onClick={handleSubmit}
                                            disabled={(!input.trim() && files.length === 0) || isLoading}
                                            className="p-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg shrink-0"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </m.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-4 sm:bottom-6 right-3 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-primary to-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white z-50 hover:scale-105 active:scale-95 transition-transform border border-white/10"
            >
                {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-7 h-7" />}
            </button>
        </>
    );
}
