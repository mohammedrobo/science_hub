import { createServiceRoleClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import { SendNotificationForm } from '@/components/notifications/SendNotificationForm';
import { ManageNotifications } from '@/components/notifications/ManageNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, RotateCcw, ImageOff, ShieldAlert, Crown, Home, UserCog, UserMinus, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { deleteUser, resetUserProgress, removeProfilePicture, resetFullAccount, updateUserRole } from '../actions';
import { AddStudentDialog } from './AddStudentDialog';
import { SectionSelector } from './SectionSelector';

interface UserWithStats {
    username: string;
    full_name: string;
    access_role: 'student' | 'leader' | 'admin';
    created_at?: string;
    user_stats: {
        total_xp: number;
        current_rank: string;
        profile_picture_url: string | null;
    }[];
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
        return []; // Optimisation: Don't fetch if no section selected
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

    const [usersResult, statsResult] = await Promise.all([
        query,
        supabase
            .from('user_stats')
            .select('username, total_xp, current_rank, profile_picture_url')
    ]);

    if (usersResult.error) {
        console.error('Fetch users error:', usersResult.error);
        return [];
    }

    // Optimization: Filter stats in memory or fetch only needed stats?
    // Since we filtered users by section (e.g. 70 users), fetching ALL stats (700 rows) is wasteful but manageable.
    // Ideally we would filter stats by list of usernames, but 'in' query has limits.
    // For < 1000 users, fetching all stats map is acceptable for now given the complexity reduction.
    // Or we can just filter the map construction.

    const statsMap = new Map(statsResult.data?.map(s => [s.username, s]) || []);

    const mappedUsers = usersResult.data.map((user: any) => ({
        ...user,
        user_stats: [statsMap.get(user.username) || { total_xp: 0, current_rank: 'E', profile_picture_url: null }]
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
    const resolvedParams = await searchParams;
    const selectedSection = resolvedParams?.section as string | undefined;

    const [users, sections] = await Promise.all([
        getUsers(selectedSection),
        getSections()
    ]);

    return (
        <div className="min-h-screen bg-zinc-950">
            {/* Header - Responsive */}
            <div className="sticky top-0 z-10 bg-zinc-950 border-b border-zinc-800">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent flex items-center gap-2">
                                <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 flex-shrink-0" />
                                <span className="hidden xs:inline">Batch Master</span>
                                <span className="xs:hidden">Admin</span>
                            </h1>
                            <p className="text-muted-foreground text-sm mt-1 hidden sm:block">Manage students, reset progress, and enforce rules.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <SectionSelector sections={sections} />

                            <Link href="/admin/feedback">
                                <Button variant="outline" size="sm" className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                                    <span className="mr-2">📬</span>
                                    <span className="hidden sm:inline">Feedback</span>
                                </Button>
                            </Link>
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

                {/* Communications Center */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            Communication Center
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="max-w-2xl space-y-8">
                            <SendNotificationForm role="admin" />
                            <div className="border-t border-zinc-800 pt-6">
                                <ManageNotifications />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="pb-2 sm:pb-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-base sm:text-lg">
                            Student Registry
                            {selectedSection && <Badge variant="secondary" className="ml-2 bg-zinc-800">{users.length} Students</Badge>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-6">
                        {!selectedSection ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                <div className="p-4 bg-zinc-900 rounded-full">
                                    <ShieldAlert className="w-12 h-12 text-zinc-600" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-semibold text-white">Select a Section</h3>
                                    <p className="text-zinc-400 max-w-md mx-auto">
                                        Please select a section from the dropdown above to view and manage students.
                                    </p>
                                </div>
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-center py-20 text-zinc-500">
                                No students found in Section {selectedSection}.
                            </div>
                        ) : (
                            <>
                                {/* Mobile Card View */}
                                <div className="block lg:hidden space-y-2 p-2 sm:p-0">
                                    {users.map((user) => {
                                        const stats = user.user_stats?.[0] || { total_xp: 0, current_rank: 'E', profile_picture_url: null };
                                        return (
                                            <div key={user.username} className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <Badge variant="outline" className={`flex-shrink-0 text-xs ${stats.current_rank === 'S' || stats.current_rank === 'SS' ? 'border-yellow-500 text-yellow-500' : 'border-zinc-600'}`}>
                                                            {stats.current_rank}
                                                        </Badge>
                                                        {stats.profile_picture_url && (
                                                            <Image
                                                                src={stats.profile_picture_url}
                                                                width={32}
                                                                height={32}
                                                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                                                alt={user.full_name || 'Profile picture'}
                                                            />
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="text-white font-medium text-sm truncate">{user.full_name}</p>
                                                            <p className="text-zinc-500 text-xs truncate">@{user.username}</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        {user.access_role === 'admin' ? (
                                                            <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-xs flex-shrink-0">Admin</Badge>
                                                        ) : user.access_role === 'leader' ? (
                                                            <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/50 text-xs flex-shrink-0">Leader</Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-xs flex-shrink-0">Student</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-700/50">
                                                    <span className="text-blue-400 font-mono text-sm">{(stats.total_xp ?? 0).toLocaleString()} XP</span>
                                                    <div className="flex gap-1">
                                                        {user.access_role !== 'admin' && (
                                                            <form action={async () => { 'use server'; await updateUserRole(user.username, user.access_role === 'leader' ? 'student' : 'leader'); }}>
                                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-500 hover:text-indigo-400" title={user.access_role === 'leader' ? "Demote to Student" : "Promote to Leader"}>
                                                                    {user.access_role === 'leader' ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                                                                </Button>
                                                            </form>
                                                        )}
                                                        {/* Admin Toggle */}
                                                        <form action={async () => { 'use server'; await updateUserRole(user.username, user.access_role === 'admin' ? 'student' : 'admin'); }}>
                                                            <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 ${user.access_role === 'admin' ? 'text-red-500 hover:text-zinc-500' : 'text-zinc-500 hover:text-red-500'}`} title={user.access_role === 'admin' ? "Demote to Student" : "Promote to Admin"}>
                                                                <Crown className="w-4 h-4" />
                                                            </Button>
                                                        </form>
                                                        <form action={async () => { 'use server'; await removeProfilePicture(user.username); }}>
                                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-500 hover:text-yellow-500" title="Remove Picture">
                                                                <ImageOff className="w-4 h-4" />
                                                            </Button>
                                                        </form>
                                                        <form action={async () => { 'use server'; await resetUserProgress(user.username); }}>
                                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-500 hover:text-orange-500" title="Reset Progress">
                                                                <RotateCcw className="w-4 h-4" />
                                                            </Button>
                                                        </form>
                                                        <form action={async () => { 'use server'; await resetFullAccount(user.username); }}>
                                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-500 hover:text-purple-500" title="Full Reset">
                                                                <ShieldAlert className="w-4 h-4" />
                                                            </Button>
                                                        </form>
                                                        <form action={async () => { 'use server'; try { await deleteUser(user.username); } catch (e) { console.error(e); } }}>
                                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-500 hover:text-red-600" title="Delete">
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </form>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-zinc-800">
                                                <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm w-[80px]">Rank</th>
                                                <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Student Name</th>
                                                <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Username</th>
                                                <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm w-[100px]">XP</th>
                                                <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm w-[100px]">Role</th>
                                                <th className="text-right py-3 px-4 text-zinc-400 font-medium text-sm w-[200px]">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((user) => {
                                                const stats = user.user_stats?.[0] || { total_xp: 0, current_rank: 'E', profile_picture_url: null };
                                                return (
                                                    <tr key={user.username} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                                                        <td className="py-3 px-4">
                                                            <Badge variant="outline" className={`${stats.current_rank === 'S' || stats.current_rank === 'SS' ? 'border-yellow-500 text-yellow-500' : 'border-zinc-700'}`}>
                                                                {stats.current_rank}
                                                            </Badge>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                {stats.profile_picture_url && (
                                                                    <Image
                                                                        src={stats.profile_picture_url}
                                                                        width={24}
                                                                        height={24}
                                                                        className="w-6 h-6 rounded-full object-cover"
                                                                        alt={user.full_name || 'Profile picture'}
                                                                    />
                                                                )}
                                                                <span className="text-white font-medium">{user.full_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 text-zinc-400">@{user.username}</td>
                                                        <td className="py-3 px-4 font-mono text-blue-400">{(stats.total_xp ?? 0).toLocaleString()}</td>
                                                        <td className="py-3 px-4">
                                                            {user.access_role === 'admin' ? (
                                                                <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/50">Admin</Badge>
                                                            ) : user.access_role === 'leader' ? (
                                                                <Badge className="bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 border-violet-500/50">Leader</Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">Student</Badge>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <div className="flex justify-end gap-1">
                                                                {user.access_role !== 'admin' && (
                                                                    <form action={async () => { 'use server'; await updateUserRole(user.username, user.access_role === 'leader' ? 'student' : 'leader'); }}>
                                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-indigo-400" title={user.access_role === 'leader' ? "Demote to Student" : "Promote to Leader"}>
                                                                            {user.access_role === 'leader' ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                                                                        </Button>
                                                                    </form>
                                                                )}
                                                                {/* Admin Toggle */}
                                                                <form action={async () => { 'use server'; await updateUserRole(user.username, user.access_role === 'admin' ? 'student' : 'admin'); }}>
                                                                    <Button size="icon" variant="ghost" className={`h-8 w-8 ${user.access_role === 'admin' ? 'text-red-500 hover:text-zinc-500' : 'text-zinc-500 hover:text-red-500'}`} title={user.access_role === 'admin' ? "Demote to Student" : "Promote to Admin"}>
                                                                        <Crown className="w-4 h-4" />
                                                                    </Button>
                                                                </form>
                                                                <form action={async () => { 'use server'; await removeProfilePicture(user.username); }}>
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-yellow-500" title="Remove Picture">
                                                                        <ImageOff className="w-4 h-4" />
                                                                    </Button>
                                                                </form>
                                                                <form action={async () => { 'use server'; await resetUserProgress(user.username); }}>
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-orange-500" title="Reset Progress Only">
                                                                        <RotateCcw className="w-4 h-4" />
                                                                    </Button>
                                                                </form>
                                                                <form action={async () => { 'use server'; await resetFullAccount(user.username); }}>
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-purple-500" title="Full Account Reset">
                                                                        <ShieldAlert className="w-4 h-4" />
                                                                    </Button>
                                                                </form>
                                                                <form action={async () => { 'use server'; try { await deleteUser(user.username); } catch (e) { console.error(e); } }}>
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-red-600" title="Delete User">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </form>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
