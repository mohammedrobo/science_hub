import { createServiceRoleClient } from '@/lib/supabase/server';
import { readSession } from '@/lib/auth/session-read';
import Link from 'next/link';
import { SendNotificationForm } from '@/components/notifications/SendNotificationForm';
import { ManageNotifications } from '@/components/notifications/ManageNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Crown, Home, Upload, BookOpen } from 'lucide-react';
import { AddStudentDialog } from './AddStudentDialog';
import { SectionSelector } from './SectionSelector';
import { SearchStudentDialog } from './SearchStudentDialog';
import { UserListWithFilter } from './UserListWithFilter';

interface UserWithStats {
    username: string;
    full_name: string;
    access_role: 'student' | 'leader' | 'admin' | 'super_admin';
    created_at?: string;
}

async function getSections(): Promise<string[]> {
    const supabase = await createServiceRoleClient();
    // Using a raw query or distinct select would be ideal.
    // Since Supabase JS client doesn't have a direct "distinct" helper easily,
    // we can select original_section and order by it, then dedup in memory (or use .rpc if we had one).
    // For 700 users, selecting just the column is cheap.
    const { data } = await supabase
        .from('allowed_users')
        .select('original_section')
        .not('original_section', 'is', null)
        .order('original_section');

    if (!data) return [];

    // De-duplicate
    const sections = Array.from(new Set(data.map(d => d.original_section).filter(Boolean)));
    // Natural sort might be needed if they are "A1", "A2", "A10" etc.
    return sections.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

async function getUsers(section?: string): Promise<UserWithStats[]> {
    if (!section) {
        return []; // Don't fetch if no section selected
    }

    const supabase = await createServiceRoleClient();

    let query = supabase
        .from('allowed_users')
        .select('username, full_name, access_role, original_section, original_group')
        .order('original_group', { ascending: true })
        .order('original_section', { ascending: true })
        .order('username', { ascending: true });

    if (section) {
        query = query.eq('original_section', section);
    }

    const usersResult = await query;

    if (usersResult.error) {
        console.error('Fetch users error:', usersResult.error);
        return [];
    }

    const mappedUsers = usersResult.data.map((user: any) => ({
        ...user,
    }));

    // Re-sort in memory just in case, though DB order is usually fine.
    // Reuse existing sort logic
    return mappedUsers.sort((a: any, b: any) => {
        try {
            const groupA = a.original_group || a.username.split('_')[0] || '';
            const groupB = b.original_group || b.username.split('_')[0] || '';
            if (groupA !== groupB) return groupA.localeCompare(groupB);

            const sectionA = a.original_section || '';
            const sectionB = b.original_section || '';
            if (sectionA !== sectionB) return sectionA.localeCompare(sectionB, undefined, { numeric: true });

            const getId = (u: string) => {
                const parts = u.split('-');
                if (parts.length >= 2) {
                    return parseInt(parts[1] || '0', 10);
                }
                return 0;
            };
            return getId(a.username) - getId(b.username);
        } catch (e) {
            console.error("Sort error for", a.username, b.username);
            return 0;
        }
    });
}

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const session = await readSession();
    const isSuperAdmin = session?.role === 'super_admin';
    const resolvedParams = await searchParams;
    const selectedSection = resolvedParams?.section as string | undefined;

    // Always require a section selection — never load all users at once
    const [users, sections] = await Promise.all([
        getUsers(selectedSection),
        getSections()
    ]);

    // Theme: gold for super_admin, red for admin
    const themeGradient = isSuperAdmin
        ? 'from-amber-400 via-yellow-500 to-orange-500'
        : 'from-red-500 to-rose-600';
    const themeIconColor = isSuperAdmin ? 'text-amber-400' : 'text-red-500';
    const themeName = isSuperAdmin ? 'Super Admin' : 'Admin';
    const themeSubtitle = isSuperAdmin
        ? 'Full control: Manage students, reset progress, and enforce rules.'
        : 'Manage students, promote leaders, and send notifications.';

    return (
        <div className="min-h-screen bg-zinc-950">
            {/* Header - Responsive */}
            <div className="sticky top-0 z-10 bg-zinc-950 border-b border-zinc-800">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <div>
                            <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r ${themeGradient} bg-clip-text text-transparent flex items-center gap-2`}>
                                <Crown className={`w-6 h-6 sm:w-8 sm:h-8 ${themeIconColor} flex-shrink-0`} />
                                <span className="hidden xs:inline">{themeName} Panel</span>
                                <span className="xs:hidden">{themeName}</span>
                            </h1>
                            <p className="text-muted-foreground text-sm mt-1 hidden sm:block">{themeSubtitle}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <SectionSelector sections={sections} />
                            <SearchStudentDialog />

                            <div className="hidden sm:block w-px h-6 bg-zinc-800" />

                            <Link href="/admin/upload">
                                <Button variant="outline" size="sm" className="border-zinc-700 bg-zinc-900 text-violet-400 hover:bg-violet-950/30 hover:text-violet-300">
                                    <Upload className="w-4 h-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Upload</span>
                                </Button>
                            </Link>
                            <Link href="/admin/lessons">
                                <Button variant="outline" size="sm" className="border-zinc-700 bg-zinc-900 text-blue-400 hover:bg-blue-950/30 hover:text-blue-300">
                                    <BookOpen className="w-4 h-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Lessons</span>
                                </Button>
                            </Link>

                            <div className="hidden sm:block w-px h-6 bg-zinc-800" />

                            {isSuperAdmin && (
                                <Link href="/admin/safety">
                                    <Button variant="outline" size="sm" className="border-zinc-700 bg-zinc-900 text-red-400 hover:bg-red-950/30 hover:text-red-300">
                                        <ShieldAlert className="w-4 h-4 sm:mr-2" />
                                        <span className="hidden sm:inline">Safety</span>
                                    </Button>
                                </Link>
                            )}
                            {isSuperAdmin && (
                                <Link href="/admin/feedback">
                                    <Button variant="outline" size="sm" className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                                        <span className="mr-2">📬</span>
                                        <span className="hidden sm:inline">Feedback</span>
                                    </Button>
                                </Link>
                            )}
                            <Link href="/">
                                <Button variant="outline" size="sm" className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                                    <Home className="w-4 h-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Home</span>
                                </Button>
                            </Link>
                            <AddStudentDialog />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-6">

                {/* Quick Stats */}
                {selectedSection && users.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 sm:p-4">
                            <p className="text-xs text-zinc-500">Total</p>
                            <p className="text-xl sm:text-2xl font-bold text-white">{users.length}</p>
                        </div>
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 sm:p-4">
                            <p className="text-xs text-zinc-500">Students</p>
                            <p className="text-xl sm:text-2xl font-bold text-zinc-300">{users.filter(u => u.access_role === 'student').length}</p>
                        </div>
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 sm:p-4">
                            <p className="text-xs text-zinc-500">Leaders</p>
                            <p className="text-xl sm:text-2xl font-bold text-violet-400">{users.filter(u => u.access_role === 'leader').length}</p>
                        </div>
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 sm:p-4">
                            <p className="text-xs text-zinc-500">Admins</p>
                            <p className="text-xl sm:text-2xl font-bold text-amber-400">{users.filter(u => ['admin', 'super_admin'].includes(u.access_role)).length}</p>
                        </div>
                    </div>
                )}

                {/* Communications Center */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            Communication Center
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="max-w-2xl space-y-8">
                            <SendNotificationForm role={isSuperAdmin ? 'super_admin' : 'admin'} />
                            <div className="border-t border-zinc-800 pt-6">
                                <ManageNotifications />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="pb-2 sm:pb-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-base sm:text-lg">
                            {selectedSection ? `Section ${selectedSection}` : 'Student Registry'}
                            {users.length > 0 && <Badge variant="secondary" className="ml-2 bg-zinc-800">{users.length} users</Badge>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {!selectedSection ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                <div className="p-4 bg-zinc-900 rounded-full">
                                    <ShieldAlert className="w-12 h-12 text-zinc-600" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-semibold text-white">Select a Section</h3>
                                    <p className="text-zinc-400 max-w-md mx-auto">
                                        Select a section from the dropdown above, or use <strong>Search Student</strong> to find anyone across all sections.
                                    </p>
                                </div>
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-center py-20 text-zinc-500">
                                No students found in Section {selectedSection}.
                            </div>
                        ) : (
                            <UserListWithFilter
                                users={users}
                                selectedSection={selectedSection}
                                isSuperAdmin={isSuperAdmin}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
