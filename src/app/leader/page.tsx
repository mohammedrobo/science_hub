import { readSession } from '@/lib/auth/session-read';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sword, Upload, Shield, Home, BookOpen, Send, RefreshCw, ArrowRight } from 'lucide-react';
import { SendNotificationForm } from '@/components/notifications/SendNotificationForm';
import { ManageNotifications } from '@/components/notifications/ManageNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LeaderTourWrapper } from './tour-wrapper';
import { checkLeaderOnboardingStatus } from './tour-actions';
import { getTranslations } from 'next-intl/server';

export default async function LeaderDashboard() {
    const session = await readSession();
    if (!session || !['super_admin', 'admin', 'leader'].includes(session.role)) {
        redirect('/');
    }

    const t = await getTranslations('leader');
    const match = session.username.match(/^[A-D]_([A-D]\d)/i);
    const userSection = match ? match[1].toUpperCase() : null;

    // Check if the leader has completed the tutorial
    const hasOnboarded = await checkLeaderOnboardingStatus();

    return (
        <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 flex flex-col items-center justify-center p-3 sm:p-4 relative">
            {/* Leader Tour */}
            <LeaderTourWrapper hasOnboarded={hasOnboarded} />

            {/* Back to Home — glassmorphism pill */}
            <Link href="/" className="absolute top-3 start-3 sm:top-4 sm:start-4 md:top-8 md:start-8 flex items-center gap-2 text-zinc-500 hover:text-white active:text-violet-400 transition-all group z-20">
                <div className="p-2 rounded-full bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 group-hover:border-violet-500/40 group-hover:shadow-lg group-hover:shadow-violet-900/20 transition-all duration-300">
                    <Home className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm sm:text-base hidden sm:block">{t('dashboard')}</span>
            </Link>

            <div className="max-w-5xl w-full space-y-6 sm:space-y-8 pt-20 sm:pt-16 md:pt-0">
                {/* Hero Section — gradient text */}
                <div className="text-center space-y-3 sm:space-y-4 px-2">
                    <div className="inline-flex p-2.5 sm:p-3.5 bg-violet-900/20 rounded-xl sm:rounded-2xl border border-violet-500/30 mb-2 sm:mb-4 shadow-lg shadow-violet-900/20">
                        <Shield className="w-8 h-8 sm:w-12 sm:h-12 text-violet-400" />
                    </div>
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight gradient-text">
                        {t('dashboard')}
                    </h1>
                    <p className="text-zinc-400 text-sm sm:text-lg max-w-2xl mx-auto">
                        {t('welcome', { name: session.name })}
                    </p>
                </div>

                {/* Communication Section - Only for Leads with Section */}
                {userSection && (
                    <div className="max-w-2xl mx-auto w-full" data-tour="notify-section">
                        <Card className="glass-card rounded-2xl border-zinc-800/60">
                            <CardHeader className="pb-3 px-4 sm:px-6">
                                <CardTitle className="text-lg flex items-center gap-2 text-white">
                                    <div className="p-1.5 rounded-lg bg-violet-500/15 border border-violet-500/20">
                                        <Send className="w-4 h-4 text-violet-400" />
                                    </div>
                                    {t('notifySection', { section: userSection })}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 sm:px-6">
                                <div className="space-y-6">
                                    <SendNotificationForm role="leader" userSection={userSection} />
                                    <div className="border-t border-zinc-800/50 pt-6">
                                        <ManageNotifications />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Navigation Cards — glassmorphism + glow */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mt-8 sm:mt-12">
                    {/* Guild Hall Card */}
                    <Link href="/guild" className="group" data-tour="guild-card">
                        <div className="h-40 sm:h-48 md:h-56 glass-card rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-900/25">
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 mb-3 sm:mb-4 group-hover:bg-violet-500/15 group-hover:border-violet-500/30 group-hover:shadow-lg group-hover:shadow-violet-900/20 transition-all duration-300">
                                    <Sword className="w-7 h-7 sm:w-8 sm:h-8 text-zinc-500 group-hover:text-violet-400 transition-colors duration-300" />
                                </div>
                                <h2 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 group-hover:text-violet-300 transition-colors">{t('guildHall')}</h2>
                                <p className="text-zinc-500 text-center text-xs sm:text-sm group-hover:text-zinc-400 transition-colors">{t('guildHallDesc')}</p>
                            </div>
                            <div className="absolute bottom-3 end-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                <ArrowRight className="w-4 h-4 text-violet-400" />
                            </div>
                        </div>
                    </Link>

                    {/* Upload Card */}
                    <Link href="/admin/upload" className="group" data-tour="upload-card">
                        <div className="h-40 sm:h-48 md:h-56 glass-card rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-900/25">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-3 sm:mb-4 group-hover:bg-blue-500/15 group-hover:border-blue-500/30 group-hover:shadow-lg group-hover:shadow-blue-900/20 transition-all duration-300">
                                    <Upload className="w-7 h-7 sm:w-8 sm:h-8 text-zinc-500 group-hover:text-blue-400 transition-colors duration-300" />
                                </div>
                                <h2 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 group-hover:text-blue-300 transition-colors">{t('uploadLesson')}</h2>
                                <p className="text-zinc-500 text-center text-xs sm:text-sm group-hover:text-zinc-400 transition-colors">{t('uploadLessonDesc')}</p>
                            </div>
                            <div className="absolute bottom-3 end-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                <ArrowRight className="w-4 h-4 text-blue-400" />
                            </div>
                        </div>
                    </Link>

                    {/* Manage Lessons Card */}
                    <Link href="/admin/lessons" className="group sm:col-span-2 md:col-span-1" data-tour="manage-card">
                        <div className="h-40 sm:h-48 md:h-56 glass-card rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-900/25">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-3 sm:mb-4 group-hover:bg-amber-500/15 group-hover:border-amber-500/30 group-hover:shadow-lg group-hover:shadow-amber-900/20 transition-all duration-300">
                                    <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-zinc-500 group-hover:text-amber-400 transition-colors duration-300" />
                                </div>
                                <h2 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 group-hover:text-amber-300 transition-colors">{t('manageLessons')}</h2>
                                <p className="text-zinc-500 text-center text-xs sm:text-sm group-hover:text-zinc-400 transition-colors">{t('manageLessonsDesc')}</p>
                            </div>
                            <div className="absolute bottom-3 end-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                <ArrowRight className="w-4 h-4 text-amber-400" />
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Replay Tutorial Footer */}
                {hasOnboarded && (
                    <div className="flex justify-center pt-2 pb-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10 gap-2 text-xs rounded-xl transition-all"
                            onClick={undefined}
                            asChild
                        >
                            <Link href="/leader?replay=1">
                                <RefreshCw className="w-3.5 h-3.5" />
                                {t('replayTutorial')}
                            </Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
