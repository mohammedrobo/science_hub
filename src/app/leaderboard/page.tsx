
import { createServiceRoleClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Crown } from 'lucide-react';
import { unstable_cache } from 'next/cache';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

const getLeaderboard = unstable_cache(
    async () => {
        const supabase = await createServiceRoleClient();

        const { data: stats, error: statsError } = await supabase
            .from('user_stats')
            .select('username, total_xp, current_rank, profile_picture_url')
            .order('total_xp', { ascending: false })
            .limit(100);

        if (statsError || !stats) {
            console.error('Fetch stats error:', statsError);
            return [];
        }

        const usernames = stats.map(s => s.username);
        const { data: users, error: usersError } = await supabase
            .from('allowed_users')
            .select('username, full_name')
            .in('username', usernames);

        if (usersError) {
            console.error('Fetch users error:', usersError);
            return [];
        }

        const userMap = new Map(users?.map(u => [u.username, u.full_name]) || []);

        return stats.map((stat, index) => ({
            ...stat,
            full_name: userMap.get(stat.username) || 'Unknown Student',
            rank_position: index + 1
        }));
    },
    ['leaderboard'],
    { revalidate: 60, tags: ['leaderboard'] }
);

function RankBadge({ position }: { position: number }) {
    if (position === 1) return <Crown className="w-6 h-6 text-yellow-500 animate-pulse" />;
    if (position === 2) return <Medal className="w-6 h-6 text-slate-300" />;
    if (position === 3) return <Medal className="w-6 h-6 text-amber-700" />;
    return <span className="font-mono text-zinc-500 text-lg w-6 text-center">{position}</span>;
}

import Link from 'next/link';
import { Button } from '@/components/ui/button';

// ... (imports remain)

export default async function LeaderboardPage() {
    const leaderboard = await getLeaderboard();
    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);
    const t = await getTranslations('leaderboard');
    const tc = await getTranslations('common');

    return (
        <div className="container mx-auto py-6 sm:py-10 px-3 sm:px-4 max-w-5xl">
            {/* Header Section with Back Button */}
            {/* Header Section */}
            <div className="mb-8">
                <Link href="/">
                    <Button variant="ghost" className="ps-0 hover:bg-transparent hover:text-primary mb-4 text-zinc-400">
                        {tc('backToHome')}
                    </Button>
                </Link>

                <div className="text-center">
                    <h1 className="text-2xl sm:text-4xl font-extrabold bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 bg-clip-text text-transparent inline-flex items-center gap-2 sm:gap-3">
                        <Trophy className="w-6 h-6 sm:w-10 sm:h-10 text-yellow-500" />
                        {t('hallOfStudents')}
                    </h1>
                    <p className="text-muted-foreground mt-3 text-lg">
                        {t('topRankedDesc')}
                    </p>
                </div>
            </div>

            {/* Top 3 Podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
                {/* 2nd Place */}
                <div className="order-2 md:order-1 pt-8 md:pt-12">
                    <Card className="bg-zinc-900/80 border-slate-700 shadow-[0_0_20px_rgba(203,213,225,0.1)] relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-slate-400 to-transparent" />
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-500 flex items-center justify-center mb-2">
                                <span className="text-2xl font-bold text-slate-300">2</span>
                            </div>
                            <CardTitle className="text-slate-200">{top3[1]?.full_name || tc('empty')}</CardTitle>
                            {/* <p className="text-sm text-zinc-500">@{top3[1]?.username}</p> */}
                        </CardHeader>
                        <CardContent className="text-center">
                            <Badge variant="outline" className="mb-2 border-slate-600 text-slate-400">
                                {top3[1]?.current_rank || '-'} Rank
                            </Badge>
                            <p className="text-2xl font-mono text-blue-400">
                                {(top3[1]?.total_xp ?? 0).toLocaleString()} XP
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* 1st Place */}
                <div className="order-1 md:order-2 z-10">
                    <Card className="bg-zinc-900/90 border-yellow-600/50 shadow-[0_0_30px_rgba(234,179,8,0.2)] transform md:scale-110 relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(234,179,8,0.1),transparent_70%)] pointer-events-none" />
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto w-20 h-20 rounded-full bg-yellow-900/20 border-2 border-yellow-500 flex items-center justify-center mb-2 shadow-lg">
                                <Crown className="w-10 h-10 text-yellow-500" />
                            </div>
                            <CardTitle className="text-yellow-100 text-xl">{top3[0]?.full_name || tc('empty')}</CardTitle>
                            {/* <p className="text-sm text-yellow-500/70">@{top3[0]?.username}</p> */}
                        </CardHeader>
                        <CardContent className="text-center">
                            <Badge className="mb-2 bg-yellow-500/20 text-yellow-300 border-yellow-500/50 hover:bg-yellow-500/30">
                                {top3[0]?.current_rank || '-'} Rank
                            </Badge>
                            <p className="text-3xl font-mono text-blue-300 font-bold">
                                {(top3[0]?.total_xp ?? 0).toLocaleString()} XP
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* 3rd Place */}
                <div className="order-3 pt-8 md:pt-12">
                    <Card className="bg-zinc-900/80 border-amber-800 shadow-[0_0_20px_rgba(180,83,9,0.1)] relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-700 to-transparent" />
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto w-16 h-16 rounded-full bg-amber-950/40 border-2 border-amber-700 flex items-center justify-center mb-2">
                                <span className="text-2xl font-bold text-amber-600">3</span>
                            </div>
                            <CardTitle className="text-amber-100/80">{top3[2]?.full_name || tc('empty')}</CardTitle>
                            {/* <p className="text-sm text-zinc-500">@{top3[2]?.username}</p> */}
                        </CardHeader>
                        <CardContent className="text-center">
                            <Badge variant="outline" className="mb-2 border-amber-800 text-amber-700">
                                {top3[2]?.current_rank || '-'} Rank
                            </Badge>
                            <p className="text-2xl font-mono text-blue-400">
                                {(top3[2]?.total_xp ?? 0).toLocaleString()} XP
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* List - Mobile Card View */}
            <div className="block lg:hidden space-y-2">
                {rest.map((user) => (
                    <div key={user.username} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 flex items-center gap-3">
                        <span className="text-zinc-500 font-mono w-8 text-center flex-shrink-0">{user.rank_position}</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-zinc-200 font-medium truncate">{user.full_name}</p>
                            {/* <p className="text-xs text-zinc-500 truncate">@{user.username}</p> */}
                        </div>
                        <Badge variant="outline" className={`flex-shrink-0 text-xs ${user.current_rank === 'S' || user.current_rank === 'SS' ? 'border-yellow-500/50 text-yellow-500' : 'border-zinc-700 text-zinc-400'}`}>
                            {user.current_rank}
                        </Badge>
                        <span className="font-mono text-blue-400 text-sm flex-shrink-0">{(user.total_xp ?? 0).toLocaleString()}</span>
                    </div>
                ))}
                {rest.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">{t('noMoreStudents')}</div>
                )}
            </div>

            {/* List - Desktop Table View */}
            <Card className="hidden lg:block bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                                <TableHead className="w-[80px] text-center">#</TableHead>
                                <TableHead>{t('studentName')}</TableHead>
                                <TableHead>{t('rank')}</TableHead>
                                <TableHead className="text-end">{t('totalXp')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rest.map((user) => (
                                <TableRow key={user.username} className="border-zinc-800 hover:bg-zinc-900/30 group">
                                    <TableCell className="text-center font-medium">
                                        <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors">
                                            {user.rank_position}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-zinc-200">{user.full_name}</span>
                                            {/* <span className="text-xs text-zinc-500">@{user.username}</span> */}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`
                                            ${['S', 'SS', 'SSS'].includes(user.current_rank) ? 'border-yellow-500/50 text-yellow-500' : 'border-zinc-700 text-zinc-400'}
                                        `}>
                                            {user.current_rank}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-end font-mono text-blue-400">
                                        {(user.total_xp ?? 0).toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {rest.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        {t('noMoreStudents')}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
