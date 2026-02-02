import { createServiceRoleClient } from '@/lib/supabase/server';
import { getSession } from '@/app/login/actions';
import { QuestBoard } from '@/components/guild/QuestBoard';
import { ChatBox } from '@/components/guild/ChatBox';
import { Sword, LayoutDashboard, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { EditNicknameDialog } from '@/components/guild/EditNicknameDialog';

export default async function GuildPage() {
    const session = await getSession();
    if (!session || !['admin', 'leader'].includes(session.role)) {
        redirect('/');
    }

    const supabase = await createServiceRoleClient();

    // Fetch initial data
    let quests: any[] = [];
    let messages: any[] = [];
    let usersData: any[] = [];
    let statsData: any[] = [];

    try {
        const [questsResult, messagesResult, usersResult, statsResult] = await Promise.all([
            supabase.from('guild_quests').select('*').order('created_at', { ascending: false }),
            supabase.from('guild_messages').select('*').order('created_at', { ascending: false }).limit(50),
            supabase.from('allowed_users').select('username, full_name, nickname, avatar_url, access_role'),
            supabase.from('user_stats').select('username, profile_picture_url')
        ]);

        quests = questsResult.data || [];
        messages = messagesResult.data ? messagesResult.data.reverse() : [];
        usersData = usersResult.data || [];
        statsData = statsResult.data || [];
    } catch (err) {
        console.error('GuildPage Data Fetch Error:', err);
    }

    // Create stats map for O(1) lookup
    const statsMap = statsData.reduce((acc: any, stat: any) => {
        acc[stat.username] = stat;
        return acc;
    }, {});

    // Create a map for easy lookup merging both sources
    const userMap = usersData.reduce((acc, user) => {
        acc[user.username] = {
            ...user,
            // Prioritize the profile picture from user_stats (where Profile page gets it)
            avatar_url: statsMap[user.username]?.profile_picture_url || user.avatar_url
        };
        return acc;
    }, {} as Record<string, any>);

    // Filter users for the Quest Board (only Admins and Leaders)
    const leaderUsers = Object.values(userMap).filter((u: any) => ['admin', 'leader'].includes(u.access_role));

    return (
        <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 selection:bg-violet-900/30">
            {/* Header */}
            <header className="h-[73px] border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="container mx-auto px-4 h-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link href="/leader" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors" title="Back to Command">
                            <LayoutDashboard className="w-5 h-5 text-zinc-400" />
                        </Link>
                        <Link href="/" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors" title="Go Home">
                            <Home className="w-5 h-5 text-zinc-400" />
                        </Link>
                        <div className="h-6 w-px bg-zinc-800 mx-2" />
                        <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                            Guild Hall
                        </h1>
                    </div>

                    {/* User Actions */}
                    <div className="flex items-center gap-2">
                        <EditNicknameDialog
                            currentUser={session.username}
                            currentNickname={userMap[session.username]?.nickname}
                        />
                    </div>
                </div>
            </header>

            {/* Main Content - Split Layout */}
            <main className="container mx-auto px-4 py-6 min-h-[calc(100dvh-73px)] lg:h-[calc(100vh-73px)] max-w-[1600px]">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">

                    {/* Left: Quest Board (30-40%) */}
                    <div className="lg:col-span-4 h-[500px] lg:h-full lg:overflow-hidden bg-zinc-900/30 rounded-xl border border-zinc-800 p-4 flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-zinc-400 text-xs font-mono uppercase tracking-wider">Quest Board</h2>
                        </div>
                        <QuestBoard
                            initialQuests={quests}
                            currentUser={session.username}
                            userRole={session.role}
                            users={leaderUsers as any}
                        />
                    </div>

                    {/* Right: Guild Chat (60-70%) */}
                    <div className="lg:col-span-8 h-[70vh] lg:h-full flex flex-col">
                        <ChatBox
                            initialMessages={messages}
                            currentUser={session.username}
                            userRole={session.role}
                            userMap={userMap}
                        />
                    </div>

                </div>
            </main>
        </div>
    );
}
