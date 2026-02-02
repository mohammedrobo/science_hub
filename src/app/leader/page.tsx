import { getSession } from '@/app/login/actions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sword, Upload, Shield, Home, BookOpen, Settings, Send } from 'lucide-react';
import { SendNotificationForm } from '@/components/notifications/SendNotificationForm';
import { ManageNotifications } from '@/components/notifications/ManageNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function LeaderDashboard() {
    const session = await getSession();
    if (!session || !['admin', 'leader'].includes(session.role)) {
        redirect('/');
    }

    const match = session.username.match(/^[A-D]_([A-D]\d)/i);
    const userSection = match ? match[1].toUpperCase() : null;

    return (
        <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 flex flex-col items-center justify-center p-3 sm:p-4 relative">
            <Link href="/" className="absolute top-3 left-3 sm:top-4 sm:left-4 md:top-8 md:left-8 flex items-center gap-2 text-zinc-500 hover:text-white active:text-violet-400 transition-colors group z-20">
                <div className="p-2 rounded-full bg-zinc-900 border border-zinc-800 group-hover:border-violet-500/50 transition-colors">
                    <Home className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm sm:text-base hidden sm:block">Back to Home</span>
            </Link>

            <div className="max-w-5xl w-full space-y-6 sm:space-y-8 pt-20 sm:pt-16 md:pt-0">
                <div className="text-center space-y-3 sm:space-y-4 px-2">
                    <div className="inline-flex p-2 sm:p-3 bg-violet-900/20 rounded-xl sm:rounded-2xl border border-violet-800/50 mb-2 sm:mb-4">
                        <Shield className="w-8 h-8 sm:w-12 sm:h-12 text-violet-400" />
                    </div>
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-violet-400 via-indigo-400 to-white bg-clip-text text-transparent">
                        Leader Dashboard
                    </h1>
                    <p className="text-zinc-400 text-sm sm:text-lg max-w-2xl mx-auto">
                        Welcome, {session.name}. Manage content and collaborate.
                    </p>
                </div>

                {/* Communication Section - Only for Leads with Section */}
                {userSection && (
                    <div className="max-w-2xl mx-auto w-full">
                        <Card className="bg-zinc-900/40 border-zinc-800">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2 text-white">
                                    <Send className="w-5 h-5 text-violet-400" />
                                    Notify Section {userSection}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    <SendNotificationForm role="leader" userSection={userSection} />
                                    <div className="border-t border-zinc-800 pt-6">
                                        <ManageNotifications />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mt-8 sm:mt-12">
                    {/* Guild Hall Card */}
                    <Link href="/guild" className="group">
                        <div className="h-40 sm:h-48 md:h-56 bg-zinc-900/40 hover:bg-zinc-900/60 active:bg-zinc-800/60 border border-zinc-800 hover:border-violet-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Sword className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 group-hover:text-violet-400 group-active:text-violet-400 transition-colors mb-3 sm:mb-4" />
                            <h2 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 group-hover:text-violet-300">Guild Hall</h2>
                            <p className="text-zinc-500 text-center text-xs sm:text-sm group-hover:text-zinc-400">Collaborate with leaders</p>
                        </div>
                    </Link>

                    {/* Upload Card */}
                    <Link href="/admin/upload" className="group">
                        <div className="h-40 sm:h-48 md:h-56 bg-zinc-900/40 hover:bg-zinc-900/60 active:bg-zinc-800/60 border border-zinc-800 hover:border-blue-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 group-hover:text-blue-400 group-active:text-blue-400 transition-colors mb-3 sm:mb-4" />
                            <h2 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 group-hover:text-blue-300">Upload Lesson</h2>
                            <p className="text-zinc-500 text-center text-xs sm:text-sm group-hover:text-zinc-400">Add new content</p>
                        </div>
                    </Link>

                    {/* Manage Lessons Card */}
                    <Link href="/admin/lessons" className="group sm:col-span-2 md:col-span-1">
                        <div className="h-40 sm:h-48 md:h-56 bg-zinc-900/40 hover:bg-zinc-900/60 active:bg-zinc-800/60 border border-zinc-800 hover:border-amber-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 group-hover:text-amber-400 group-active:text-amber-400 transition-colors mb-3 sm:mb-4" />
                            <h2 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 group-hover:text-amber-300">Manage Lessons</h2>
                            <p className="text-zinc-500 text-center text-xs sm:text-sm group-hover:text-zinc-400">Edit or delete content</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
