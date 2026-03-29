'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Calculator, Trophy, User, LogOut, Shield, Calendar, BarChart3, X, Megaphone, Zap, Crown } from 'lucide-react';
import { signout } from '@/app/login/actions';
import { LanguageMobileButton } from '@/components/LanguageSwitcher';
import { useLocale, useTranslations } from 'next-intl';

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
        'E': 'bg-zinc-600 border-zinc-500 shadow-zinc-500/30',
        'D': 'bg-emerald-500 border-emerald-400 shadow-emerald-500/30',
        'C': 'bg-blue-500 border-blue-400 shadow-blue-500/30',
        'B': 'bg-purple-500 border-purple-400 shadow-purple-500/30',
        'A': 'bg-yellow-500 border-yellow-400 shadow-yellow-500/30',
        'S': 'bg-red-500 border-red-400 shadow-red-500/30',
        'SS': 'bg-orange-500 border-orange-400 shadow-orange-500/30',
        'SSS': 'bg-pink-500 border-pink-400 shadow-pink-500/30'
    };
    return colors[rank] || colors['E'];
}

function Divider() {
    return <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-1" />;
}

export function MobileMenu({ isAdmin, session, userNameInitial, profilePictureUrl, rank, xp, userRole }: MobileMenuProps) {
    const [open, setOpen] = useState(false);
    const t = useTranslations('nav');
    const locale = useLocale();

    const closeMenu = () => setOpen(false);
    const menuSide = locale === 'en' ? 'left' : 'right';

    // Premium styling for menu links
    const linkClass = "flex items-center gap-4 px-4 py-3 mx-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/5 active:bg-white/10 hover:ml-4 transition-all duration-300 w-[calc(100%-1rem)]";

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-md" />
                    <Menu className="h-5 w-5 text-zinc-300 group-hover:text-white transition-colors" />
                    <span className="sr-only">{t('openMenu')}</span>
                </Button>
            </SheetTrigger>
            
            {/* The Glassy Sheet */}
            <SheetContent side={menuSide} className="w-[85vw] max-w-[340px] border-s border-indigo-500/20 bg-gradient-to-b from-zinc-950/98 via-[#0f0b1a]/98 to-black/98 backdrop-blur-[40px] p-0 gap-0 shadow-2xl overflow-hidden" hideClose>
                <SheetTitle className="sr-only">{t('navigationMenu')}</SheetTitle>
                
                <div className="flex flex-col h-full relative overflow-hidden">
                    {/* Background Noise Texture (Subtle) */}
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] pointer-events-none mix-blend-overlay" />

                    {/* Close Button */}
                    <SheetClose asChild>
                        <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-105 active:scale-95 text-zinc-400 hover:text-white transition-all z-20 shadow-lg backdrop-blur-md">
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </Button>
                    </SheetClose>

                    {/* User Header Section */}
                    <div className="pt-14 pb-8 px-6 relative flex flex-col items-center text-center">
                        {/* Ambient Glow matching rank color usually, but violet looks cleanest */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[150px] bg-violet-600/20 blur-[60px] pointer-events-none rounded-full" />
                        
                        <div className={`relative h-20 w-20 mb-4 rounded-full overflow-hidden flex items-center justify-center font-bold shadow-[0_0_20px_rgba(0,0,0,0.5)] border-2 ${getRankColor(rank)}`}>
                            {profilePictureUrl ? (
                                <img src={profilePictureUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-white text-2xl drop-shadow-md">{userNameInitial}</span>
                            )}
                        </div>

                        <div className="w-full px-2 relative z-10">
                            <p className="text-lg font-bold text-white leading-snug mb-0.5 line-clamp-1 break-words tracking-tight" dir="auto">
                                {session?.name || "Guest"}
                            </p>
                            <p className="text-[13px] text-zinc-400 truncate mb-4 font-medium" dir="ltr">
                                @{session?.username || "guest"}
                            </p>

                            <div className="flex items-center justify-center gap-3">
                                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-lg border-t border-white/20 flex items-center gap-1.5 ${getRankColor(rank)}`}>
                                    <Zap className="h-3.5 w-3.5 fill-white/50" />
                                    {rank} RANK
                                </span>
                                <span className="text-xs text-zinc-300 font-bold flex items-center gap-1.5 bg-zinc-900/50 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10 shadow-lg">
                                    <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                                    {xp} XP
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Scroll Area */}
                    <div className="flex-1 overflow-y-auto pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        <Divider />
                        <div className="py-2 space-y-1">
                            <Link href="/progress" onClick={closeMenu} className={linkClass}>
                                <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                                    <BarChart3 className="h-[18px] w-[18px] text-emerald-400" />
                                </div>
                                <span className="font-medium text-sm tracking-wide">{t('myProgress')}</span>
                            </Link>
                            
                            <Link href="/tools/gpa" onClick={closeMenu} className={linkClass}>
                                <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                                    <Calculator className="h-[18px] w-[18px] text-orange-400" />
                                </div>
                                <span className="font-medium text-sm tracking-wide">{t('gpaCalculator')}</span>
                            </Link>
                            
                            <Link href="/leaderboard" onClick={closeMenu} className={linkClass}>
                                <div className="p-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                                    <Trophy className="h-[18px] w-[18px] text-yellow-400" />
                                </div>
                                <span className="font-medium text-sm tracking-wide">{t('leaderboard')}</span>
                            </Link>
                            
                            <Link href="/schedule" onClick={closeMenu} className={linkClass}>
                                <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                                    <Calendar className="h-[18px] w-[18px] text-violet-400" />
                                </div>
                                <span className="font-medium text-sm tracking-wide">{t('schedule')}</span>
                            </Link>
                            
                            <Link href="/announcements" onClick={closeMenu} className={linkClass}>
                                <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                                    <Megaphone className="h-[18px] w-[18px] text-blue-400" />
                                </div>
                                <span className="font-medium text-sm tracking-wide">{t('announcements')}</span>
                            </Link>
                        </div>

                        {/* Admin / Leader Actions */}
                        {(isAdmin || ['super_admin', 'admin', 'leader'].includes(userRole || '')) && (
                            <>
                                <Divider />
                                <div className="py-2 space-y-1">
                                    {isAdmin && (
                                        <Link href="/admin" onClick={closeMenu} className={linkClass}>
                                            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                                                <Crown className="h-[18px] w-[18px] text-amber-400 fill-amber-500/20" />
                                            </div>
                                            <span className="font-medium text-sm tracking-wide">{t('adminPanel')}</span>
                                        </Link>
                                    )}
                                    {['super_admin', 'admin', 'leader'].includes(userRole || '') && (
                                        <Link href="/leader" onClick={closeMenu} className={linkClass}>
                                            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                                                <Shield className="h-[18px] w-[18px] text-indigo-400 fill-indigo-500/20" />
                                            </div>
                                            <span className="font-medium text-sm tracking-wide">{t('leaderDashboard')}</span>
                                        </Link>
                                    )}
                                </div>
                            </>
                        )}

                        <Divider />
                        <div className="py-2">
                            <LanguageMobileButton className="hover:ml-4" />
                        </div>

                        <Divider />
                        <div className="py-2 space-y-1">
                            <Link href="/profile" onClick={closeMenu} className={linkClass}>
                                <div className="p-1.5 rounded-lg bg-zinc-500/10 border border-zinc-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                                    <User className="h-[18px] w-[18px] text-zinc-400" />
                                </div>
                                <span className="font-medium text-sm tracking-wide">{t('viewProfile')}</span>
                            </Link>
                        </div>
                    </div>

                    {/* Footer / Logout Button */}
                    <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-md">
                        <button onClick={() => { closeMenu(); signout(); }}
                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 active:scale-[0.98] transition-all w-full text-red-400 font-bold tracking-wide shadow-lg shadow-red-500/5 group">
                            <LogOut className="h-[18px] w-[18px] group-hover:-translate-x-1 transition-transform" />
                            {t('logout')}
                        </button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
