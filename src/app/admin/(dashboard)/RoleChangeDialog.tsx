'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowUpCircle, ArrowDownCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { updateUserRole } from '../actions';

interface RoleChangeDialogProps {
    username: string;
    fullName: string;
    currentRole: 'student' | 'leader' | 'admin' | 'super_admin';
    targetRole: 'student' | 'leader' | 'admin' | 'super_admin';
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ROLE_CONFIG = {
    student: { label: 'Student', color: 'bg-zinc-800 text-zinc-400', icon: '🎓' },
    leader: { label: 'Leader', color: 'bg-violet-500/20 text-violet-400 border-violet-500/50', icon: '⭐' },
    admin: { label: 'Admin', color: 'bg-red-500/20 text-red-400 border-red-500/50', icon: '🛡️' },
    super_admin: { label: 'Super Admin', color: 'bg-amber-500/20 text-amber-400 border-amber-500/50', icon: '👑' },
};

export function RoleChangeDialog({ username, fullName, currentRole, targetRole, open, onOpenChange }: RoleChangeDialogProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const isPromotion = ['student', 'leader', 'admin', 'super_admin'].indexOf(targetRole) > ['student', 'leader', 'admin', 'super_admin'].indexOf(currentRole);

    const handleConfirm = () => {
        startTransition(async () => {
            try {
                const result = await updateUserRole(username, targetRole);
                if (result && 'error' in result) {
                    toast.error(result.error);
                } else {
                    toast.success(
                        isPromotion
                            ? `${fullName} promoted to ${ROLE_CONFIG[targetRole].label}`
                            : `${fullName} demoted to ${ROLE_CONFIG[targetRole].label}`
                    );
                    onOpenChange(false);
                    router.refresh();
                }
            } catch {
                toast.error('Failed to change role');
            }
        });
    };

    const current = ROLE_CONFIG[currentRole];
    const target = ROLE_CONFIG[targetRole];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        {isPromotion ? (
                            <ArrowUpCircle className="w-5 h-5 text-emerald-400" />
                        ) : (
                            <ArrowDownCircle className="w-5 h-5 text-orange-400" />
                        )}
                        {isPromotion ? 'Promote' : 'Demote'} User
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        This action will change {fullName}&apos;s permissions immediately.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* User info */}
                    <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                        <div className="font-medium text-white">{fullName}</div>
                        <div className="text-sm text-zinc-500">@{username}</div>
                    </div>

                    {/* Role change visualization */}
                    <div className="flex items-center justify-center gap-4 py-2">
                        <div className="text-center">
                            <Badge className={current.color}>{current.icon} {current.label}</Badge>
                            <div className="text-xs text-zinc-600 mt-1">Current</div>
                        </div>
                        <div className="text-zinc-600 text-xl">→</div>
                        <div className="text-center">
                            <Badge className={target.color}>{target.icon} {target.label}</Badge>
                            <div className="text-xs text-zinc-600 mt-1">New Role</div>
                        </div>
                    </div>

                    {/* Warning for admin promotion */}
                    {targetRole === 'admin' && (
                        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <ShieldAlert className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-red-300">
                                <strong>Warning:</strong> Admin users can manage students, promote leaders, send notifications, and access the admin panel.
                            </div>
                        </div>
                    )}

                    {targetRole === 'student' && currentRole === 'admin' && (
                        <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                            <ShieldAlert className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-orange-300">
                                <strong>Warning:</strong> This will immediately revoke all admin permissions from {fullName}.
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                        className="border-zinc-800 bg-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isPending}
                        className={
                            isPromotion
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-orange-600 hover:bg-orange-700 text-white'
                        }
                    >
                        {isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : isPromotion ? (
                            <ArrowUpCircle className="w-4 h-4 mr-2" />
                        ) : (
                            <ArrowDownCircle className="w-4 h-4 mr-2" />
                        )}
                        {isPending ? 'Updating...' : `Confirm ${isPromotion ? 'Promotion' : 'Demotion'}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
