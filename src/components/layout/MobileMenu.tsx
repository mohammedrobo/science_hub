'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Calculator, Trophy, Crown, User, LogOut, Shield, Calendar, BarChart3, X, Megaphone } from 'lucide-react';
import { signout } from '@/app/login/actions';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslations } from 'next-intl';

interface MobileMenuProps {
    isAdmin: boolean;
    session: any;
    userNameInitial: string;
    profilePictureUrl?: string;
    rank: string;
    xp: number;
    userRole?: string;
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
    const t = useTranslations('nav');

    const closeMenu = () => setOpen(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">{t('openMenu')}</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[75vw] max-w-[320px] border-s border-border/50 bg-background/95 backdrop-blur-xl p-0 gap-0" hideClose>
                <SheetTitle className="sr-only">{t('navigationMenu')}</SheetTitle>
                <div className="flex flex-col h-full relative">
                    {/* Close Button — pinned to full sheet top-right */}
                    <SheetClose asChild>
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-full bg-zinc-800/60 hover:bg-zinc-700 text-zinc-500 hover:text-white transition-colors z-20">
                            <X className="h-3.5 w-3.5" />
                            <span className="sr-only">Close</span>
                        </Button>
                    </SheetClose>

                    {/* User Header */}
                    <div className="pt-12 pb-6 px-5 border-b border-border/50 bg-gradient-to-b from-violet-950/20 via-muted/20 to-background flex flex-col items-center text-center">                        <div className={`h-16 w-16 mb-3 rounded-full border-[3px] overflow-hidden flex items-center justify-center font-bold shadow-lg ring-2 ring-violet-500/20 ring-offset-2 ring-offset-background ${getRankColor(rank)}`}>
                        {profilePictureUrl ? (
                            <img src={profilePictureUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <span className="text-white text-xl">{userNameInitial}</span>
                        )}
                    </div>

                        <div className="w-full px-2">
                            <p className="text-sm font-bold text-foreground leading-snug mb-1 line-clamp-2 break-words" dir="auto">{session?.name || "Guest"}</p>
                            <p className="text-[11px] text-muted-foreground truncate leading-tight mb-3" dir="ltr">@{session?.username || "guest"}</p>

                            <div className="flex items-center justify-center gap-3">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-black tracking-wider text-white shadow-sm ${getRankColor(rank)}`}>
                                    {rank} Rank
                                </span>
                                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 bg-muted/50 rounded-md px-2.5 py-1 border border-border/50">
                                    <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                                    {xp} {t('xp')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="px-2 py-2 space-y-0.5 stagger-enter">
                            <Link href="/progress" onClick={closeMenu}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/80 active:bg-muted transition-colors">
                                <BarChart3 className="h-[18px] w-[18px] text-emerald-500 shrink-0" />
                                <span className="text-[13px] font-medium">{t('myProgress')}</span>
                            </Link>
                            <Link href="/tools/gpa" onClick={closeMenu}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/80 active:bg-muted transition-colors">
                                <Calculator className="h-[18px] w-[18px] text-orange-500 shrink-0" />
                                <span className="text-[13px] font-medium">{t('gpaCalculator')}</span>
                            </Link>
                            <Link href="/leaderboard" onClick={closeMenu}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/80 active:bg-muted transition-colors">
                                <Trophy className="h-[18px] w-[18px] text-yellow-500 shrink-0" />
                                <span className="text-[13px] font-medium">{t('leaderboard')}</span>
                            </Link>
                            <Link href="/schedule" onClick={closeMenu}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/80 active:bg-muted transition-colors">
                                <Calendar className="h-[18px] w-[18px] text-violet-500 shrink-0" />
                                <span className="text-[13px] font-medium">{t('schedule')}</span>
                            </Link>
                            <Link href="/announcements" onClick={closeMenu}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/80 active:bg-muted transition-colors">
                                <Megaphone className="h-[18px] w-[18px] text-blue-500 shrink-0" />
                                <span className="text-[13px] font-medium">{t('announcements')}</span>
                            </Link>


                        </div>

                        {/* Admin / Leader */}
                        {(isAdmin || ['super_admin', 'admin', 'leader'].includes(userRole || '')) && (
                            <div className="px-2 py-1 space-y-0.5 border-t border-border/40 mx-2 mt-1 pt-2">
                                {isAdmin && (
                                    <Link href="/admin" onClick={closeMenu}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/80 active:bg-muted transition-colors">
                                        <Crown className="h-[18px] w-[18px] text-amber-500 shrink-0" />
                                        <span className="text-[13px] font-medium">{t('adminPanel')}</span>
                                    </Link>
                                )}
                                {['super_admin', 'admin', 'leader'].includes(userRole || '') && (
                                    <Link href="/leader" onClick={closeMenu}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/80 active:bg-muted transition-colors">
                                        <Shield className="h-[18px] w-[18px] text-violet-500 shrink-0" />
                                        <span className="text-[13px] font-medium">{t('leaderDashboard')}</span>
                                    </Link>
                                )}
                            </div>
                        )}

                        {/* Language */}
                        <div className="px-2 py-1 border-t border-border/40 mx-2 mt-1 pt-2">
                            <LanguageSwitcher variant="full" />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-border px-2 py-2 space-y-0.5">
                        <Link href="/profile" onClick={closeMenu}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/80 active:bg-muted transition-colors">
                            <User className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
                            <span className="text-[13px] font-medium">{t('viewProfile')}</span>
                        </Link>
                        <button onClick={() => { closeMenu(); signout(); }}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors w-full">
                            <LogOut className="h-[18px] w-[18px] shrink-0" />
                            <span className="text-[13px] font-medium">{t('logout')}</span>
                        </button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
