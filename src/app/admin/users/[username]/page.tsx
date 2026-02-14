import { getActivityLogs } from '../../safety/actions';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Shield, Clock, MapPin } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { notFound, redirect } from 'next/navigation';
import { readSession } from '@/lib/auth/session-read';

interface PageProps {
    params: Promise<{ username: string }>;
}

export default async function UserAuditPage({ params }: PageProps) {
    // Auth check — super_admin only
    const session = await readSession();
    if (!session || session.role !== 'super_admin') redirect('/');

    const { username } = await params;
    const decodedUsername = decodeURIComponent(username);
    const supabase = await createServiceRoleClient();

    // 1. Fetch User Details
    const { data: user, error: userError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('username', decodedUsername)
        .single();

    // Also fetch allowed_users for role/name
    const { data: allowedUser } = await supabase
        .from('allowed_users')
        .select('*')
        .eq('username', decodedUsername)
        .single();

    if (userError || !user) {
        return notFound();
    }

    // 2. Fetch User Logs
    const { data: logs } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('username', decodedUsername)
        .order('created_at', { ascending: false })
        .limit(200);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/safety">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">Student Audit</h1>
            </div>

            {/* Profile Card */}
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                            <Avatar className="w-16 h-16 border-2 border-zinc-700">
                                <AvatarImage src={user.profile_picture_url || ''} />
                                <AvatarFallback className="text-xl bg-zinc-800">
                                    {decodedUsername.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-xl text-white">
                                    {allowedUser?.full_name || decodedUsername}
                                </CardTitle>
                                <div className="text-zinc-400 font-mono text-sm mt-1">
                                    @{decodedUsername}
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                                        Rank: {user.current_rank}
                                    </Badge>
                                    <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                                        XP: {user.total_xp}
                                    </Badge>
                                    <Badge className={allowedUser?.access_role === 'super_admin' ? 'bg-red-500/20 text-red-300' : allowedUser?.access_role === 'admin' ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300'}>
                                        {allowedUser?.access_role === 'super_admin' ? 'Super Admin' : allowedUser?.access_role || 'student'}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Activity History */}
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="w-5 h-5 text-zinc-400" />
                        Activity History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!logs || logs.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500">
                            No activity recorded for this user.
                        </div>
                    ) : (
                        <ScrollArea className="h-[500px] pr-4">
                            <div className="space-y-6">
                                {logs.map((log: any) => (
                                    <div key={log.id} className="relative pl-6 border-l border-zinc-800 py-1">
                                        <div className={`absolute left-[-5px] top-2 w-2.5 h-2.5 rounded-full border border-zinc-900 ${log.action_type === 'LOGIN' ? 'bg-green-500' :
                                            log.action_type.includes('FAIL') ? 'bg-red-500' :
                                                'bg-zinc-600'
                                            }`} />

                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                                            <div>
                                                <div className="font-medium text-zinc-200">
                                                    {log.action_type.replace(/_/g, ' ')}
                                                </div>
                                                {log.details && (
                                                    <div className="text-sm text-zinc-500 mt-1">
                                                        {JSON.stringify(log.details)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="text-xs text-zinc-500 font-mono">
                                                    {new Date(log.created_at).toLocaleString()}
                                                </div>
                                                <div className="flex items-center justify-end gap-1 text-[10px] text-zinc-600 mt-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {log.ip_address}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
