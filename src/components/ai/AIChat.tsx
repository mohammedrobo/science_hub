'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Sparkles, User, Bot } from 'lucide-react';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    isStreaming?: boolean;
}

export function AIChat() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'init',
            role: 'assistant',
            content: "Greetings, Student. I am Da Vinci. Ready to unlock the secrets of the universe? 🌌",
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Load history on mount
    useEffect(() => {
        const loadHistory = async () => {
            const { getChatHistory } = await import('@/app/actions/chat');
            const { messages: history } = await getChatHistory();

            if (history && history.length > 0) {
                setMessages(history.map(msg => ({
                    id: msg.id,
                    role: msg.role,
                    content: msg.content,
                    isStreaming: false
                })));
            }
        };
        loadHistory();
    }, []);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Streaming Effect Helper
    const streamText = async (text: string, messageId: string) => {
        const words = text.split(''); // Split by character for smoother "typing"
        let currentText = '';

        for (let i = 0; i < words.length; i++) {
            currentText += words[i];
            // Update the specific message in state
            setMessages(prev => prev.map(msg =>
                msg.id === messageId
                    ? { ...msg, content: currentText, isStreaming: true }
                    : msg
            ));
            // Slight delay for typing effect
            await new Promise(resolve => setTimeout(resolve, 15));
        }

        // Finish streaming
        setMessages(prev => prev.map(msg =>
            msg.id === messageId
                ? { ...msg, isStreaming: false }
                : msg
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const { saveChatMessage } = await import('@/app/actions/chat');

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        // Save User Message asynchronously
        saveChatMessage('user', userMsg.content);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg.content })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch');
            }

            const botMsgId = (Date.now() + 1).toString();
            // Initialize empty bot message
            setMessages(prev => [...prev, {
                id: botMsgId,
                role: 'assistant',
                content: '',
                isStreaming: true
            }]);

            // Save Assistant Message (Optimistic/Initial) - We save full content after streaming usually, 
            // but for safety let's save after streaming completes.

            // Start streaming the response
            await streamText(data.content, botMsgId);

            // Save full Assistant Message
            saveChatMessage('assistant', data.content);

        } catch (error) {
            console.error('Chat Error:', error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: "System Malfunction... (Check API Key configuration) ⚠️"
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <LazyMotion features={domAnimation}>
            <div className="flex flex-col h-[400px] sm:h-[500px] md:h-[600px] w-full max-w-4xl mx-auto border-2 border-indigo-500/30 rounded-xl bg-slate-950 overflow-hidden shadow-[0_0_40px_-5px_rgba(79,70,229,0.3)] relative">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(56,33,252,0.15),transparent_60%)] pointer-events-none" />

            {/* Header */}
            <div className="p-4 border-b border-indigo-500/20 flex items-center gap-3 bg-slate-900 z-10">
                <div className="p-2 bg-indigo-600/20 rounded-lg border border-indigo-500/30 shadow-[0_0_10px_rgba(79,70,229,0.3)]">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                    <h3 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300 tracking-wide text-lg">
                        DA VINCI SYSTEM
                    </h3>
                    <p className="text-[10px] text-indigo-400/70 font-mono tracking-widest uppercase">
                        Class S Assistant
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div
                className="flex-1 p-6 relative z-0 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-500/20 scrollbar-track-transparent custom-scrollbar"
                ref={scrollRef}
            >
                <div className="space-y-6 pb-4">
                    {messages.map((msg) => (
                        <m.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "flex gap-4 max-w-[85%]",
                                msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                            )}
                        >
                            {/* Avatar */}
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-lg",
                                msg.role === 'user'
                                    ? "bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-blue-500/20"
                                    : "bg-indigo-600/20 border-indigo-500/50 text-indigo-300 shadow-indigo-500/20"
                            )}>
                                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                            </div>

                            {/* Bubble */}
                            <div className={cn(
                                "p-4 rounded-2xl text-sm leading-relaxed shadow-md border",
                                msg.role === 'user'
                                    ? "bg-blue-900/40 border-blue-500/20 text-blue-100 rounded-tr-sm"
                                    : "bg-indigo-900/40 border-indigo-500/20 text-indigo-100 rounded-tl-sm"
                            )}>
                                {msg.content}
                                {msg.isStreaming && (
                                    <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-indigo-400 animate-pulse" />
                                )}
                            </div>
                        </m.div>
                    ))}

                    {isLoading && !messages[messages.length - 1].isStreaming && (
                        <div className="flex gap-4 max-w-[85%]">
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
            <div className="p-4 border-t border-indigo-500/20 bg-slate-900 z-10">
                <form onSubmit={handleSubmit} className="flex gap-3 relative">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Enter your command..."
                        className={cn(
                            "bg-slate-950/50 border-indigo-500/30 text-indigo-100 placeholder:text-indigo-500/50",
                            "focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500",
                            "h-12 px-4 rounded-xl text-base shadow-inner"
                        )}
                        disabled={isLoading}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!input.trim() || isLoading}
                        className={cn(
                            "h-12 w-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)] transition-all",
                            "disabled:opacity-50 disabled:shadow-none hover:scale-105 active:scale-95"
                        )}
                    >
                        <Send className="w-5 h-5" />
                    </Button>
                </form>
            </div>
            </div>
        </LazyMotion>
    );
}
