
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


        </div>
    );
}
