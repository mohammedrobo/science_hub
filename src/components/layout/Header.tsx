import Link from 'next/link';
import { SemesterToggle } from './SemesterToggle';
import { UserNav } from './UserNav';
import { BookOpen, Crown, Sparkles } from 'lucide-react';
import { getSession } from '@/app/login/actions';
import { MobileMenu } from './MobileMenu';
import { getHeaderStats } from '@/lib/gamification';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export async function Header() {
    const session = await getSession();
    const isAdmin = session?.role === 'admin';

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
        <header className="border-b border-border bg-background sticky top-0 z-50 overflow-x-hidden">
            <div className="container mx-auto px-4 min-h-16 flex items-center justify-between">
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

                <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">

                    <Link href="/tools/gpa" className="hover:text-primary transition-colors">
                        GPA Calc
                    </Link>
                    <Link href="/leaderboard" className="hover:text-primary transition-colors">
                        Leaderboard
                    </Link>
                    <Link href="/schedule" className="hover:text-primary transition-colors">
                        Schedule
                    </Link>
                    <Link href="/updates" className="hover:text-primary transition-colors flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5" />
                        What's New
                    </Link>

                    {/* Admin Button */}
                    {isAdmin && (
                        <Link href="/admin" className="hover:text-primary transition-colors">
                            Admin
                        </Link>
                    )}
                </nav>

                <div className="flex items-center gap-3 shrink-0">
                    <div className="shrink-0">
                        <SemesterToggle />
                    </div>
                    <div className="shrink-0">
                        <NotificationBell userRole={session?.role as 'admin' | 'leader' | 'student'} />
                    </div>
                    <div className="shrink-0 hidden md:block">
                        <UserNav />
                    </div>

                    {/* Mobile Menu (Client Component) */}
                    <div className="md:hidden shrink-0">
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
