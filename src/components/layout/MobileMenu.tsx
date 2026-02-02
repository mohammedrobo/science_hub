'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Sparkles, Calculator, Trophy, Crown, User, LogOut, Shield, Calendar } from 'lucide-react';
import { LogoutButton } from '@/components/auth/LogoutButton';

interface MobileMenuProps {
    isAdmin: boolean;
    session: any;
    userNameInitial: string;
    profilePictureUrl?: string;
    rank: string;
    xp: number;
    userRole?: string; // Explicit role prop
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

export function MobileMenu({ isAdmin, session, userNameInitial, profilePictureUrl, rank, xp, userRole }: MobileMenuProps) {
    const [open, setOpen] = useState(false);

    const closeMenu = () => setOpen(false);

    // ... (rest of render until Nav) ...

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] sm:w-[400px] border-l border-border bg-background p-0">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="flex flex-col h-full">
                    {/* Header with User Info */}
                    <div className="p-6 border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className={`h-12 w-12 shrink-0 rounded-full border-2 overflow-hidden flex items-center justify-center font-bold shadow-sm ${getRankColor(rank)}`}>
                                {profilePictureUrl ? (
                                    <img
                                        src={profilePictureUrl}
                                        alt="Profile"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span className="text-white">{userNameInitial}</span>
                                )}
                            </div>
                            <div className="overflow-hidden flex-1">
                                <p className="text-sm font-medium truncate text-foreground">{session?.name || "Guest User"}</p>
                                <p className="text-xs text-muted-foreground truncate">@{session?.username || "guest"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Rank & XP Display */}
                    <div className="px-6 py-4 border-b border-border bg-muted/20">
                        <div className="flex items-center gap-3">
                            <Trophy className="h-5 w-5 text-yellow-500" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Rank: {rank}</p>
                                <p className="text-xs text-muted-foreground">{xp} XP</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex-1 p-6 space-y-2">
                        <Link
                            href="/ai"
                            onClick={closeMenu}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-muted transition-colors"
                        >
                            <Sparkles className="h-5 w-5 text-primary" />
                            <span className="font-medium">AI Assistant</span>
                        </Link>
                        <Link
                            href="/tools/gpa"
                            onClick={closeMenu}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-muted transition-colors"
                        >
                            <Calculator className="h-5 w-5 text-primary" />
                            <span className="font-medium">GPA Calculator</span>
                        </Link>
                        <Link
                            href="/leaderboard"
                            onClick={closeMenu}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-muted transition-colors"
                        >
                            <Trophy className="h-5 w-5 text-primary" />
                            <span className="font-medium">Leaderboard</span>
                        </Link>
                        <Link
                            href="/schedule"
                            onClick={closeMenu}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-muted transition-colors"
                        >
                            <Calendar className="h-5 w-5 text-violet-500" />
                            <span className="font-medium">Schedule</span>
                        </Link>

                        {/* Admin Link */}
                        {isAdmin && (
                            <Link
                                href="/admin"
                                onClick={closeMenu}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-muted transition-colors"
                            >
                                <Crown className="h-5 w-5 text-amber-500" />
                                <span className="font-medium">Admin Panel</span>
                            </Link>
                        )}

                        {/* Leader Link */}
                        {['admin', 'leader'].includes(userRole || '') && (
                            <Link
                                href="/leader"
                                onClick={closeMenu}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-muted transition-colors"
                            >
                                <Shield className="h-5 w-5 text-violet-500" />
                                <span className="font-medium">Leader Dashboard</span>
                            </Link>
                        )}
                    </nav>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-border bg-muted/10 space-y-2">
                        <Link
                            href="/profile"
                            onClick={closeMenu}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-card border border-border hover:bg-muted/50 transition-colors"
                        >
                            <User className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium text-foreground">View Profile</span>
                        </Link>
                        <div className="rounded-lg bg-card border border-border hover:bg-muted/50 transition-colors">
                            <LogoutButton />
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
