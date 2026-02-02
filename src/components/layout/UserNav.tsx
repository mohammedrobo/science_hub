import { getSession } from '@/app/login/actions';
import { getUserStats } from '@/lib/gamification';
import { User, LogOut, Trophy, Shield } from 'lucide-react';
import Link from 'next/link';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogoutButton } from '@/components/auth/LogoutButton';

function getInitials(name: string): string {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function getRankColor(rank: string): string {
    const colors: Record<string, string> = {
        'E': 'bg-zinc-600 border-zinc-500',
        'D': 'bg-green-600 border-green-500',
        'C': 'bg-blue-600 border-blue-500',
        'B': 'bg-purple-600 border-purple-500',
        'A': 'bg-yellow-600 border-yellow-500',
        'S': 'bg-red-600 border-red-500',
        'SS': 'bg-orange-600 border-orange-500',
        'SSS': 'bg-pink-600 border-pink-500'
    };
    return colors[rank] || colors['E'];
}

export async function UserNav() {
    const session = await getSession();

    if (!session) {
        return null;
    }

    const stats = await getUserStats(session.username);
    const displayName = stats?.fullName || session.name || session.username;
    const rank = stats?.currentRank || 'E';
    const xp = stats?.totalXp || 0;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
                <div className="relative group cursor-pointer">
                    {/* Avatar */}
                    <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center
                        ${getRankColor(rank)}
                        border-2 
                        transition-all duration-300 overflow-hidden
                        group-hover:scale-110 group-hover:shadow-lg
                    `}>
                        {stats?.profilePictureUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={stats.profilePictureUrl}
                                alt={displayName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="font-bold text-sm text-white">
                                {getInitials(displayName)}
                            </span>
                        )}
                    </div>

                    {/* Rank Badge */}
                    <div className={`
                        absolute -bottom-1 -right-1
                        ${getRankColor(rank)}
                        border border-background
                        rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white
                        shadow-md
                    `}>
                        {rank}
                    </div>
                </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-56 bg-zinc-900 border-zinc-800"
                collisionPadding={10}
                sideOffset={8}
            >
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none text-white">
                            {displayName}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                            @{session.username}
                        </p>
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="bg-zinc-800" />

                <DropdownMenuItem className="focus:bg-zinc-800 focus:text-white">
                    <Trophy className="mr-2 h-4 w-4 text-yellow-500" />
                    <div className="flex flex-col flex-1">
                        <span className="text-sm font-medium">Rank: {rank}</span>
                        <span className="text-xs text-muted-foreground">{xp} XP</span>
                    </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-zinc-800" />

                <DropdownMenuItem asChild className="focus:bg-zinc-800 focus:text-white cursor-pointer">
                    <Link href="/profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>View Profile</span>
                    </Link>
                </DropdownMenuItem>

                {['admin', 'leader'].includes(session.role) && (
                    <DropdownMenuItem asChild className="focus:bg-zinc-800 focus:text-white cursor-pointer">
                        <Link href="/leader" className="flex items-center">
                            <Shield className="mr-2 h-4 w-4 text-violet-400" />
                            <span>Leader Dashboard</span>
                        </Link>
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator className="bg-zinc-800" />

                <DropdownMenuItem className="focus:bg-zinc-800 focus:text-white p-0">
                    <LogoutButton />
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
