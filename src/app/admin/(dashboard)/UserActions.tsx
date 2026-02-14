'use client';

import { useState } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Crown, Trash2, ImageOff, RotateCcw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RoleChangeDialog } from './RoleChangeDialog';
import { deleteUser, resetUserProgress, removeProfilePicture, resetFullAccount } from '../actions';
import { toast } from 'sonner';

interface UserActionsProps {
    username: string;
    fullName: string;
    currentRole: 'student' | 'leader' | 'admin' | 'super_admin';
    isSuperAdmin: boolean;
}

export function UserActions({ username, fullName, currentRole, isSuperAdmin }: UserActionsProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [targetRole, setTargetRole] = useState<'student' | 'leader' | 'admin' | 'super_admin'>('student');

    const openRoleDialog = (newRole: 'student' | 'leader' | 'admin' | 'super_admin') => {
        setTargetRole(newRole);
        setDialogOpen(true);
    };

    return (
        <>
            {/* Leader toggle: for non-admin/super_admin users */}
            {currentRole !== 'admin' && currentRole !== 'super_admin' && (
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-zinc-500 hover:text-indigo-400"
                    title={currentRole === 'leader' ? 'Demote to Student' : 'Promote to Leader'}
                    onClick={() => openRoleDialog(currentRole === 'leader' ? 'student' : 'leader')}
                >
                    {currentRole === 'leader' ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                </Button>
            )}

            {/* Admin Toggle - super_admin only */}
            {isSuperAdmin && currentRole !== 'super_admin' && (
                <Button
                    size="icon"
                    variant="ghost"
                    className={`h-8 w-8 ${currentRole === 'admin' ? 'text-red-500 hover:text-zinc-500' : 'text-zinc-500 hover:text-red-500'}`}
                    title={currentRole === 'admin' ? 'Demote Admin' : 'Promote to Admin'}
                    onClick={() => openRoleDialog(currentRole === 'admin' ? 'student' : 'admin')}
                >
                    <Crown className="w-4 h-4" />
                </Button>
            )}

            {/* Destructive actions: super_admin only */}
            {isSuperAdmin && (
                <>
                    <form action={async () => {
                        const result = await removeProfilePicture(username);
                        if ('error' in result) toast.error(result.error);
                        else toast.success('Profile picture removed');
                    }}>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-yellow-500" title="Remove Picture">
                            <ImageOff className="w-4 h-4" />
                        </Button>
                    </form>
                    <form action={async () => {
                        const result = await resetUserProgress(username);
                        if ('error' in result) toast.error(result.error);
                        else toast.success('Progress reset');
                    }}>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-orange-500" title="Reset Progress Only">
                            <RotateCcw className="w-4 h-4" />
                        </Button>
                    </form>
                    <form action={async () => {
                        const result = await resetFullAccount(username);
                        if ('error' in result) toast.error(result.error);
                        else toast.success('Account reset');
                    }}>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-purple-500" title="Full Account Reset">
                            <ShieldAlert className="w-4 h-4" />
                        </Button>
                    </form>
                </>
            )}

            {/* Delete: admin can delete students/leaders, super_admin can delete anyone except themselves */}
            {(isSuperAdmin || (currentRole !== 'admin' && currentRole !== 'super_admin')) && (
                <form action={async () => {
                    const result = await deleteUser(username);
                    if (result && 'error' in result) {
                        toast.error(result.error);
                    } else {
                        toast.success(`User ${username} deleted`);
                    }
                }}>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-red-600" title="Delete User">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </form>
            )}

            <RoleChangeDialog
                username={username}
                fullName={fullName}
                currentRole={currentRole}
                targetRole={targetRole}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </>
    );
}
