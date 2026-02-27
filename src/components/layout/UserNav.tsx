import { type SessionData } from '@/lib/auth/session-read';
import { User, Trophy, Shield } from 'lucide-react';
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
import { getTranslations } from 'next-intl/server';

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

interface UserNavProps {
    session: SessionData | null;
    displayName: string;
    profilePictureUrl?: string;
    rank: string;
    xp: number;
}

export async function UserNav({
    session,
    displayName,
    profilePictureUrl,
    rank,
    xp,
}: UserNavProps) {
    const t = await getTranslations('nav');

    if (!session) {
        return null;
    }

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
                        {profilePictureUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={profilePictureUrl}
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
                    <Trophy className="me-2 h-4 w-4 text-yellow-500" />
                    <div className="flex flex-col flex-1">
                        <span className="text-sm font-medium">{t('rank')}: {rank}</span>
                        <span className="text-xs text-muted-foreground">{xp} {t('xp')}</span>
                    </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-zinc-800" />

                <DropdownMenuItem asChild className="focus:bg-zinc-800 focus:text-white cursor-pointer">
                    <Link href="/profile" className="flex items-center">
                        <User className="me-2 h-4 w-4" />
                        <span>{t('viewProfile')}</span>
                    </Link>
                </DropdownMenuItem>

                {['super_admin', 'admin', 'leader'].includes(session.role) && (
                    <DropdownMenuItem asChild className="focus:bg-zinc-800 focus:text-white cursor-pointer">
                        <Link href="/leader" className="flex items-center">
                            <Shield className="me-2 h-4 w-4 text-violet-400" />
                            <span>{t('leaderDashboard')}</span>
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
