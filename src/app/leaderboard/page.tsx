import Link from 'next/link';
import Image from 'next/image';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy, Crown } from 'lucide-react';
import { unstable_cache } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';

export const revalidate = 60;

type LeaderboardEntry = {
    username: string;
    total_xp: number | null;
    current_rank: string;
    profile_picture_url: string | null;
    full_name: string;
    rank_position: number;
};

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return (parts[0]?.slice(0, 2) || 'ST').toUpperCase();
}

function getRankBadgeClass(rank: string): string {
    return ['S', 'SS', 'SSS'].includes(rank)
        ? 'border-yellow-500/50 text-yellow-500'
        : 'border-zinc-700 text-zinc-400';
}

interface StudentAvatarProps {
    name: string;
    imageUrl: string | null;
    sizeClass: string;
    borderClass?: string;
    priority?: boolean;
}

function StudentAvatar({
    name,
    imageUrl,
    sizeClass,
    borderClass = 'border-zinc-700',
    priority = false,
}: StudentAvatarProps) {
    return (
        <div
            className={`relative shrink-0 overflow-hidden rounded-full border bg-zinc-800 ${sizeClass} ${borderClass}`}
            aria-label={name}
        >
            {imageUrl ? (
                <Image
                    src={imageUrl}
                    alt={`${name} profile picture`}
                    width={128}
                    height={128}
                    className="h-full w-full object-cover"
                    sizes="(max-width: 640px) 48px, 72px"
                    priority={priority}
                />
            ) : (
                <span className="flex h-full w-full items-center justify-center text-xs font-bold text-zinc-300">
                    {getInitials(name)}
                </span>
            )}
        </div>
    );
}

const getLeaderboard = unstable_cache(
    async (): Promise<LeaderboardEntry[]> => {
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

        const usernames = stats.map((s) => s.username);
        if (usernames.length === 0) {
            return [];
        }

        const { data: users, error: usersError } = await supabase
            .from('allowed_users')
            .select('username, full_name')
            .in('username', usernames);

        if (usersError) {
            console.error('Fetch users error:', usersError);
            return [];
        }

        const userMap = new Map(users?.map((u) => [u.username, u.full_name]) || []);

        return stats.map((stat, index) => ({
            ...stat,
            full_name: userMap.get(stat.username) || 'Unknown Student',
            rank_position: index + 1,
        }));
    },
    ['leaderboard'],
    { revalidate: 60, tags: ['leaderboard'] }
);

export default async function LeaderboardPage() {
    const leaderboard = await getLeaderboard();
    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);
    const t = await getTranslations('leaderboard');
    const tc = await getTranslations('common');

    if (leaderboard.length === 0) {
        return (
            <div className="container mx-auto py-6 sm:py-10 px-3 sm:px-4 max-w-5xl">
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
                    </div>
                </div>

                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="py-10 text-center text-muted-foreground">
                        {t('noMoreStudents')}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 sm:py-10 px-3 sm:px-4 max-w-5xl">
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
                    <p className="text-muted-foreground mt-3 text-sm sm:text-lg px-2">
                        {t('topRankedDesc')}
                    </p>
                </div>
            </div>

            {/* Top 3 Podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
                {/* 2nd Place */}
                <div className="order-2 md:order-1 pt-2 md:pt-10">
                    <Card className="bg-zinc-900/80 border-slate-700 shadow-[0_0_20px_rgba(203,213,225,0.1)] relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-slate-400 to-transparent" />
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto mb-2 relative">
                                <StudentAvatar
                                    name={top3[1]?.full_name || tc('empty')}
                                    imageUrl={top3[1]?.profile_picture_url || null}
                                    sizeClass="h-16 w-16"
                                    borderClass="border-slate-500"
                                />
                                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-200 text-slate-900 text-xs font-black flex items-center justify-center">
                                    2
                                </span>
                            </div>
                            <CardTitle className="text-slate-200 truncate" title={top3[1]?.full_name || tc('empty')}>
                                {top3[1]?.full_name || tc('empty')}
                            </CardTitle>
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
                    <Card className="bg-zinc-900/90 border-yellow-600/50 shadow-[0_0_30px_rgba(234,179,8,0.2)] md:scale-110 relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(234,179,8,0.1),transparent_70%)] pointer-events-none" />
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto mb-2 relative">
                                <StudentAvatar
                                    name={top3[0]?.full_name || tc('empty')}
                                    imageUrl={top3[0]?.profile_picture_url || null}
                                    sizeClass="h-20 w-20"
                                    borderClass="border-yellow-500"
                                    priority
                                />
                                <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-yellow-500 text-zinc-900 flex items-center justify-center shadow-lg">
                                    <Crown className="w-4 h-4" />
                                </span>
                            </div>
                            <CardTitle className="text-yellow-100 text-xl truncate" title={top3[0]?.full_name || tc('empty')}>
                                {top3[0]?.full_name || tc('empty')}
                            </CardTitle>
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
                <div className="order-3 pt-2 md:pt-10">
                    <Card className="bg-zinc-900/80 border-amber-800 shadow-[0_0_20px_rgba(180,83,9,0.1)] relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-700 to-transparent" />
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto mb-2 relative">
                                <StudentAvatar
                                    name={top3[2]?.full_name || tc('empty')}
                                    imageUrl={top3[2]?.profile_picture_url || null}
                                    sizeClass="h-16 w-16"
                                    borderClass="border-amber-700"
                                />
                                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-700 text-white text-xs font-black flex items-center justify-center">
                                    3
                                </span>
                            </div>
                            <CardTitle className="text-amber-100/80 truncate" title={top3[2]?.full_name || tc('empty')}>
                                {top3[2]?.full_name || tc('empty')}
                            </CardTitle>
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

            {/* List - Mobile/Tablet Card View */}
            <div className="block lg:hidden space-y-2">
                {rest.map((user) => (
                    <div key={user.username} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 flex items-center gap-3 min-h-16">
                        <span className="text-zinc-500 font-mono w-8 text-center flex-shrink-0">{user.rank_position}</span>

                        <StudentAvatar
                            name={user.full_name}
                            imageUrl={user.profile_picture_url}
                            sizeClass="h-10 w-10"
                        />

                        <div className="flex-1 min-w-0">
                            <p className="text-zinc-200 font-medium truncate" title={user.full_name}>{user.full_name}</p>
                        </div>

                        <Badge variant="outline" className={`flex-shrink-0 text-xs ${getRankBadgeClass(user.current_rank)}`}>
                            {user.current_rank}
                        </Badge>

                        <div className="text-right flex-shrink-0">
                            <span className="font-mono text-blue-400 text-sm">{(user.total_xp ?? 0).toLocaleString()}</span>
                            <p className="text-[10px] text-zinc-500 leading-none mt-0.5">XP</p>
                        </div>
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
                                        <div className="flex items-center gap-3 min-w-0">
                                            <StudentAvatar
                                                name={user.full_name}
                                                imageUrl={user.profile_picture_url}
                                                sizeClass="h-10 w-10"
                                            />
                                            <span className="font-medium text-zinc-200 truncate" title={user.full_name}>{user.full_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={getRankBadgeClass(user.current_rank)}>
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
