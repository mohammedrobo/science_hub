'use client';

import { useState } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Crown, Trash2, ImageOff, RotateCcw, ShieldAlert, Pencil, KeyRound, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
        <div className="flex items-center justify-end gap-1">
            {/* Primary inline buttons — always visible */}

            {/* Leader toggle: students/leaders only */}
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

            {/* Admin Toggle — super_admin only */}
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

            {/* Delete — always visible (admin can delete students/leaders, super can delete anyone) */}
            {(isSuperAdmin || (currentRole !== 'admin' && currentRole !== 'super_admin')) && (
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-zinc-500 hover:text-red-600"
                    title="Delete User"
                    onClick={async () => {
                        if (!confirm(`Delete ${fullName} (${username})? This cannot be undone.`)) return;
                        const result = await deleteUser(username);
                        if (result && 'error' in result) toast.error(result.error);
                        else toast.success(`User ${username} deleted`);
                    }}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            )}

            {/* More actions dropdown — admins can modify students/leaders, super_admin can modify anyone */}
            {(isSuperAdmin || (currentRole !== 'admin' && currentRole !== 'super_admin')) && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-zinc-500 hover:text-zinc-300"
                            title="More actions"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 bg-zinc-900 border-zinc-700">
                        <DropdownMenuItem
                            className="gap-2 text-zinc-300 focus:text-white focus:bg-zinc-800 cursor-pointer"
                            onClick={() => setEditNameOpen(true)}
                        >
                            <Pencil className="w-4 h-4 text-blue-400" />
                            Edit Name
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="gap-2 text-zinc-300 focus:text-white focus:bg-zinc-800 cursor-pointer"
                            onClick={async () => {
                                const result = await removeProfilePicture(username);
                                if ('error' in result) toast.error(result.error);
                                else toast.success('Profile picture removed');
                            }}
                        >
                            <ImageOff className="w-4 h-4 text-yellow-500" />
                            Remove Picture
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="bg-zinc-700" />

                        <DropdownMenuItem
                            className="gap-2 text-zinc-300 focus:text-white focus:bg-zinc-800 cursor-pointer"
                            onClick={async () => {
                                if (!confirm(`Reset password for ${fullName} (${username})? They will be forced to change it on next login.`)) return;
                                const result = await resetUserPassword(username);
                                if ('error' in result) toast.error(result.error);
                                else toast.success('Password reset — user must change on next login');
                            }}
                        >
                            <KeyRound className="w-4 h-4 text-cyan-500" />
                            Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="gap-2 text-zinc-300 focus:text-white focus:bg-zinc-800 cursor-pointer"
                            onClick={async () => {
                                if (!confirm(`Reset all progress for ${fullName} (${username})? This clears XP, rank, quiz scores and cannot be undone.`)) return;
                                const result = await resetUserProgress(username);
                                if ('error' in result) toast.error(result.error);
                                else toast.success('Progress reset');
                            }}
                        >
                            <RotateCcw className="w-4 h-4 text-orange-500" />
                            Reset Progress
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="bg-zinc-700" />

                        <DropdownMenuItem
                            className="gap-2 text-red-400 focus:text-red-300 focus:bg-red-950/50 cursor-pointer"
                            onClick={async () => {
                                if (!confirm(`Full reset ${fullName} (${username})? This resets password, progress, onboarding and cannot be undone.`)) return;
                                const result = await resetFullAccount(username);
                                if ('error' in result) toast.error(result.error);
                                else toast.success('Account fully reset');
                            }}
                        >
                            <ShieldAlert className="w-4 h-4" />
                            Full Account Reset
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
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
        </div>
    );
}
