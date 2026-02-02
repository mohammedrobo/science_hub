'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Trash2, MoreVertical, Edit2, X, Check, User } from 'lucide-react';
import { toast } from 'sonner';
import { sendGuildMessage, deleteGuildMessage, updateGuildMessage } from '@/app/guild/actions';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface Message {
    id: string;
    sender_username: string;
    content: string;
    created_at: string;
}

interface UserProfile {
    username: string;
    full_name: string;
    nickname?: string;
    avatar_url: string | null;
}

// Deterministic color for avatar fallback
function getAvatarColor(username: string) {
    const colors = [
        'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
        'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500',
        'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500',
        'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

export function ChatBox({ initialMessages, currentUser, userRole, userMap: initialUserMap = {} }: { initialMessages: Message[], currentUser: string, userRole?: string, userMap?: Record<string, UserProfile> }) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [userMap, setUserMap] = useState<Record<string, UserProfile>>(initialUserMap);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

    const scrollRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        // Scroll to bottom on load and new messages
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        // Subscribe to Messages
        const messageChannel = supabase
            .channel('guild_chat')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'guild_messages' },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newMsg = payload.new as Message;
                        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
                    } else if (payload.eventType === 'DELETE') {
                        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
                    } else if (payload.eventType === 'UPDATE') {
                        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new as Message : m));
                    }
                }
            ).subscribe((status, err) => {
                if (err) console.warn('Guild chat subscription error:', err);
            });

        // Subscribe to User Profile Changes (Nicknames, Avatars)
        const userChannel = supabase
            .channel('guild_users')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'allowed_users' },
                (payload) => {
                    const updatedUser = payload.new as UserProfile;
                    setUserMap(prev => ({
                        ...prev,
                        [updatedUser.username]: {
                            ...prev[updatedUser.username], // Keep existing data (like avatar fallback if any)
                            ...updatedUser
                        }
                    }));
                }
            ).subscribe((status, err) => {
                if (err) console.warn('Guild users subscription error:', err);
            });

        return () => {
            supabase.removeChannel(messageChannel);
            supabase.removeChannel(userChannel);
        };
    }, []); // userMap dependency causing re-subscription loops? Better to use functional state update.

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isLoading) return;

        setIsLoading(true);
        // Optimistic update? No, let Realtime handle it to avoid dupes/complexity
        const res = await sendGuildMessage(newMessage);
        setIsLoading(false);

        if (res.error) {
            toast.error(res.error);
        } else {
            setNewMessage('');
        }
    };

    const handleDeleteMessage = async (id: string) => {
        const res = await deleteGuildMessage(id);
        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success("Message deleted");
        }
    };

    const startEditing = (msg: Message) => {
        setEditingId(msg.id);
        setEditContent(msg.content);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditContent('');
    };

    const saveEdit = async () => {
        if (!editingId || !editContent.trim()) return;

        const res = await updateGuildMessage(editingId, editContent);
        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success("Message updated");
            setEditingId(null);
        }
    };

    return (
        <div className="h-full flex flex-col bg-zinc-950/40 rounded-xl border border-zinc-800 overflow-hidden backdrop-blur-sm shadow-2xl">
            {/* Header */}
            <div className="p-2 sm:p-3 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between backdrop-blur-md shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                        <span className="text-sm sm:text-lg">💬</span>
                    </div>
                    <div>
                        <h2 className="font-bold text-zinc-100 text-xs sm:text-sm">Guild Chat</h2>
                        <p className="text-[9px] sm:text-[10px] text-zinc-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Encrypted Channel
                        </p>
                    </div>
                </div>
                {/* <div className="text-xs text-zinc-600 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800">
                    {messages.length} messages
                </div> */}
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4 custom-scrollbar bg-gradient-to-b from-zinc-950/50 to-zinc-900/20"
            >
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50">
                        <MoreVertical className="w-8 h-8 sm:w-12 sm:h-12 mb-2" />
                        <p className="text-xs sm:text-sm">No messages yet. Start the conversation!</p>
                    </div>
                )}

                {messages.map((msg, index) => {
                    const isMe = msg.sender_username === currentUser;
                    const showHeader = index === 0 || messages[index - 1].sender_username !== msg.sender_username;
                    const avatarColor = getAvatarColor(msg.sender_username);
                    const userProfile = userMap[msg.sender_username];
                    const isEditing = editingId === msg.id;

                    return (
                        <div key={msg.id} className={cn("group flex gap-2 sm:gap-3", isMe ? "flex-row-reverse" : "flex-row")}>
                            {/* Avatar */}
                            <div className={cn("shrink-0 flex flex-col items-center", !showHeader && "invisible")}>
                                <Avatar className="w-7 h-7 sm:w-8 sm:h-8 border-2 border-zinc-900 shadow-md">
                                    <AvatarImage
                                        src={userProfile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.full_name || msg.sender_username)}&background=random&color=fff&rounded=true&bold=true`}
                                    />
                                    <AvatarFallback className={cn("text-white bg-zinc-800", avatarColor)}>
                                        <User className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </AvatarFallback>
                                </Avatar>
                            </div>

                            <div className={cn("flex flex-col max-w-[80%] sm:max-w-[70%]", isMe ? "items-end" : "items-start")}>
                                {/* Name & Time */}
                                {showHeader && (
                                    <div className={cn("flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 px-1", isMe && "flex-row-reverse")}>
                                        <span className={cn("text-[10px] sm:text-xs font-bold hover:text-white cursor-pointer transition-colors",
                                            isMe ? "text-violet-400" : "text-zinc-300"
                                        )}>
                                            {userProfile?.nickname || userProfile?.full_name || msg.sender_username}
                                        </span>
                                        <span className="text-[9px] sm:text-[10px] text-zinc-600">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                )}

                                {/* Message Bubble group */}
                                <div className={cn("relative flex items-end gap-2 group/bubble", isMe && "flex-row-reverse")}>

                                    {/* Action Buttons (Desktop Hover / Mobile Always visible via Menu or logic) */}
                                    {isMe && !isEditing && (
                                        <div className="opacity-100 sm:opacity-0 sm:group-hover/bubble:opacity-100 transition-opacity flex gap-1 items-center">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-full"
                                                onClick={() => startEditing(msg)}
                                            >
                                                <Edit2 className="w-3 h-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-full"
                                                onClick={() => handleDeleteMessage(msg.id)}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    )}

                                    <div className={cn(
                                        "px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm shadow-md transition-colors min-w-[40px]",
                                        isMe
                                            ? "bg-violet-600 text-white rounded-xl sm:rounded-2xl rounded-tr-sm"
                                            : "bg-zinc-800 text-zinc-200 rounded-xl sm:rounded-2xl rounded-tl-sm border border-zinc-700/50"
                                    )}>
                                        {isEditing ? (
                                            <div className="flex flex-col gap-2 min-w-[200px]">
                                                <Input
                                                    value={editContent}
                                                    onChange={e => setEditContent(e.target.value)}
                                                    className="h-8 bg-black/20 border-white/20 text-white text-xs"
                                                    autoFocus
                                                />
                                                <div className="flex gap-2 justify-end">
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-red-500/20 hover:text-red-200" onClick={cancelEditing}>
                                                        <X className="w-3 h-3" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-emerald-500/20 hover:text-emerald-200" onClick={saveEdit}>
                                                        <Check className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            msg.content
                                        )}
                                    </div>

                                    {/* Action Menu for Admin deleting others */}
                                    {!isMe && userRole === 'admin' && (
                                        <div className="opacity-0 group-hover/bubble:opacity-100 transition-opacity">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-600 hover:text-zinc-300 rounded-full">
                                                        <MoreVertical className="w-3 h-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" className="w-32 bg-zinc-900 border-zinc-800">
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeleteMessage(msg.id)}
                                                        className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer text-xs"
                                                    >
                                                        <Trash2 className="w-3 h-3 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            <div className="p-2 sm:p-3 bg-zinc-950 border-t border-zinc-800/50 shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                    <div className="flex-1 bg-zinc-900/50 rounded-lg sm:rounded-xl border border-zinc-800 focus-within:ring-2 focus-within:ring-violet-500/50 focus-within:border-violet-500 transition-colors">
                        <Input
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="bg-transparent border-none text-zinc-100 placeholder:text-zinc-500 h-9 sm:h-10 text-xs sm:text-sm focus-visible:ring-0"
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={isLoading || !newMessage.trim()}
                        className={cn(
                            "h-9 w-9 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl shadow-lg shadow-violet-500/20 transition-colors shrink-0",
                            newMessage.trim()
                                ? "bg-violet-600 hover:bg-violet-500 text-white"
                                : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                        )}
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
