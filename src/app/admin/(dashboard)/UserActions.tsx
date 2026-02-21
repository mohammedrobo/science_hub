'use client';

import { useState } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Crown, Trash2, ImageOff, RotateCcw, ShieldAlert, Pencil, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RoleChangeDialog } from './RoleChangeDialog';
import { EditNameDialog } from './EditNameDialog';
import { deleteUser, resetUserProgress, removeProfilePicture, resetFullAccount, resetUserPassword } from '../actions';
import { toast } from 'sonner';

interface UserActionsProps {
    username: string;
    fullName: string;
    currentRole: 'student' | 'leader' | 'admin' | 'super_admin';
    isSuperAdmin: boolean;
}

export function UserActions({ username, fullName, currentRole, isSuperAdmin }: UserActionsProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editNameOpen, setEditNameOpen] = useState(false);
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

            {/* Edit Name - super_admin only */}
            {isSuperAdmin && (
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-zinc-500 hover:text-blue-400"
                    title="Edit Name"
                    onClick={() => setEditNameOpen(true)}
                >
                    <Pencil className="w-4 h-4" />
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
                        if (!confirm(`Reset password for ${fullName} (${username})? They will be forced to change it on next login.`)) return;
                        const result = await resetUserPassword(username);
                        if ('error' in result) toast.error(result.error);
                        else toast.success('Password reset — user must change on next login');
                    }}>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-cyan-500" title="Reset Password">
                            <KeyRound className="w-4 h-4" />
                        </Button>
                    </form>
                    <form action={async () => {
                        if (!confirm(`Reset all progress for ${fullName} (${username})? This clears XP, rank, quiz scores and cannot be undone.`)) return;
                        const result = await resetUserProgress(username);
                        if ('error' in result) toast.error(result.error);
                        else toast.success('Progress reset');
                    }}>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-orange-500" title="Reset Progress Only">
                            <RotateCcw className="w-4 h-4" />
                        </Button>
                    </form>
                    <form action={async () => {
                        if (!confirm(`Full reset ${fullName} (${username})? This resets password, progress, onboarding and cannot be undone.`)) return;
                        const result = await resetFullAccount(username);
                        if ('error' in result) toast.error(result.error);
                        else toast.success('Account fully reset');
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

            <EditNameDialog
                username={username}
                currentName={fullName}
                open={editNameOpen}
                onOpenChange={setEditNameOpen}
            />
        </>
    );
}
