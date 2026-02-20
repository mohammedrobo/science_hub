import Link from 'next/link';
import { SemesterToggle } from './SemesterToggle';
import { UserNav } from './UserNav';
import { BookOpen, Crown, Sparkles, BarChart3, Calculator, Trophy, Calendar, Shield } from 'lucide-react';
import { getSession } from '@/app/login/actions';
import { MobileMenu } from './MobileMenu';
import { getHeaderStats } from '@/lib/gamification';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { getTranslations } from 'next-intl/server';

export async function Header() {
    const session = await getSession();
    const isAdmin = session?.role === 'super_admin' || session?.role === 'admin';
    const t = await getTranslations('nav');

    let profilePictureUrl: string | undefined;
    let userNameInitial = "U";
    let rank = "E";
    let xp = 0;

    if (session?.username) {
        const stats = await getHeaderStats(session.username);
        profilePictureUrl = stats.profilePictureUrl;
        rank = stats.currentRank || "E";
        xp = stats.totalXp || 0;

        const displayName = stats.fullName || session.name;
        if (displayName) {
            userNameInitial = displayName[0].toUpperCase();
        }
    }

    return (
        <header className="border-b border-border bg-background sticky top-0 z-50">
            <div className="mx-auto px-3 sm:px-4 lg:px-6 min-h-16 flex items-center justify-between max-w-[1600px]">
                <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                    <div className="bg-gradient-to-br from-violet-600 to-indigo-600 p-2 rounded text-white shadow-lg shadow-violet-500/20">
                        <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                        <span className="hidden sm:block font-bold text-lg text-foreground tracking-tight leading-none">
                            Science Hub
                        </span>
                    </div>
                </Link>

                <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">

                    <Link href="/tools/gpa" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-zinc-400 hover:text-orange-400 hover:bg-orange-500/10 transition-all">
                        <Calculator className="h-3.5 w-3.5 text-orange-500" />
                        {t('gpaCalc')}
                    </Link>
                    <Link href="/progress" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all">
                        <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />
                        {t('progress')}
                    </Link>
                    <Link href="/leaderboard" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-zinc-400 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all">
                        <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                        {t('leaderboard')}
                    </Link>
                    <Link href="/schedule" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-zinc-400 hover:text-violet-400 hover:bg-violet-500/10 transition-all">
                        <Calendar className="h-3.5 w-3.5 text-violet-500" />
                        {t('schedule')}
                    </Link>
                    <Link href="/updates" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-zinc-400 hover:text-fuchsia-400 hover:bg-fuchsia-500/10 transition-all">
                        <Sparkles className="h-3.5 w-3.5 text-fuchsia-500" />
                        {t('whatsNew')}
                    </Link>

                    {/* Admin Button */}
                    {isAdmin && (
                        <Link href="/admin" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all">
                            <Shield className="h-3.5 w-3.5 text-amber-500" />
                            {t('admin')}
                        </Link>
                    )}
                </nav>

                <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                    <div className="shrink-0">
                        <SemesterToggle />
                    </div>
                    <div className="shrink-0 hidden sm:block">
                        <LanguageSwitcher />
                    </div>
                    <div className="shrink-0">
                        <NotificationBell userRole={session?.role as 'super_admin' | 'admin' | 'leader' | 'student'} />
                    </div>
                    <div className="shrink-0 hidden lg:block">
                        <UserNav />
                    </div>

                    {/* Mobile Menu (Client Component) */}
                    <div className="lg:hidden shrink-0">
                        <MobileMenu
                            isAdmin={isAdmin}
                            session={session}
                            userNameInitial={userNameInitial}
                            profilePictureUrl={profilePictureUrl}
                            rank={rank}
                            xp={xp}
                            userRole={session?.role}
                        />
                    </div>
                </div>
            </div>
        </header>
    );
}
