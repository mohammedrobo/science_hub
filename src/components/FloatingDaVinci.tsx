'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    isStreaming?: boolean;
}

export function FloatingDaVinci() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    // Chat State
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'init',
            role: 'assistant',
            content: "How can I assist you today, Student? ⚡",
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    // Hide on specific pages
    if (pathname === '/login' || pathname === '/change-password' || pathname?.startsWith('/guild')) {
        return null;
    }

    const streamText = async (text: string, messageId: string) => {
        const words = text.split('');
        let currentText = '';
        for (let i = 0; i < words.length; i++) {
            currentText += words[i];
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, content: currentText, isStreaming: true } : msg
            ));
            await new Promise(resolve => setTimeout(resolve, 10)); // Faster typing for widget
        }
        setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, isStreaming: false } : msg
        ));
    };

    const handleSubmit = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg.content })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            const botMsgId = (Date.now() + 1).toString();
            setMessages(prev => [...prev, {
                id: botMsgId,
                role: 'assistant',
                content: '',
                isStreaming: true
            }]);

            await streamText(data.content, botMsgId);

        } catch (error) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: "Connection failed. Please try again."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <LazyMotion features={domAnimation}>
            <>
                {/* Chat Window */}
                <AnimatePresence>
                    {isOpen && (
                        <m.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="fixed bottom-20 sm:bottom-24 right-3 sm:right-6 w-[calc(100%-1.5rem)] sm:w-80 md:w-96 h-[60vh] sm:h-[450px] max-h-[500px] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
                        >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-primary to-secondary p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                    <MessageSquare className="w-4 h-4 text-white" />
                                </div>
                                <span className="font-semibold text-white">Da Vinci Chat</span>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 p-4 overflow-y-auto bg-zinc-900/50" ref={scrollRef}>
                            <div className="space-y-4">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex gap-3 max-w-[90%]",
                                            msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                                        )}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border text-xs",
                                            msg.role === 'user'
                                                ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
                                                : "bg-indigo-600/20 border-indigo-500/50 text-indigo-300"
                                        )}>
                                            {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                        </div>

                                        <div className={cn(
                                            "p-3 rounded-lg text-sm shadow-sm",
                                            msg.role === 'user'
                                                ? "bg-blue-600/20 text-blue-100 rounded-tr-none"
                                                : "bg-zinc-800 text-zinc-100 rounded-tl-none"
                                        )}>
                                            {msg.content}
                                            {msg.isStreaming && <span className="inline-block w-1.5 h-3 ml-1 bg-indigo-400 animate-pulse" />}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && !messages[messages.length - 1].isStreaming && (
                                    <div className="flex gap-2">
                                        <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center">
                                            <Bot className="w-4 h-4 text-indigo-300" />
                                        </div>
                                        <div className="flex items-center gap-1 p-2 bg-zinc-800 rounded-lg rounded-tl-none">
                                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Input */}
                        <div className="p-3 border-t border-zinc-800 bg-zinc-900">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask Da Vinci..."
                                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-primary"
                                    onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                                />
                                <button
                                    onClick={handleSubmit}
                                    disabled={!input.trim() || isLoading}
                                    className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg px-3 py-2 transition-colors flex items-center justify-center"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        </m.div>
                    )}
                </AnimatePresence>

                {/* Floating Button */}
                <m.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(!isOpen)}
                    className="fixed bottom-4 sm:bottom-6 right-3 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-primary to-secondary rounded-full shadow-lg flex items-center justify-center text-white z-50 hover:shadow-xl transition-shadow border border-white/10"
                >
                    {isOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />}
                </m.button>
            </>
        </LazyMotion>
    );
}
