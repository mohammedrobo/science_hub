'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { resetAllAccounts } from '../actions';
import { toast } from 'sonner';

export function ResetAllButton() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleReset = async () => {
        // Triple-confirm — this is nuclear
        const step1 = confirm(
            '⚠️ FULL RESET ALL ACCOUNTS\n\n' +
            'This will reset EVERY account on the platform:\n' +
            '• All passwords → original defaults\n' +
            '• All progress & XP → wiped\n' +
            '• All onboarding → reset\n' +
            '• All guild data → deleted\n' +
            '• Admin/Super Admin roles are preserved\n\n' +
            'This action CANNOT be undone.\n\n' +
            'Are you sure?'
        );
        if (!step1) return;

        const step2 = prompt(
            'Type "RESET ALL" to confirm you want to reset every account:'
        );
        if (step2 !== 'RESET ALL') {
            toast.error('Reset cancelled — confirmation text did not match.');
            return;
        }

        setLoading(true);
        try {
            const result = await resetAllAccounts();
            if (!result) {
                toast.error('Reset failed: no response from server.');
            } else if ('error' in result) {
                toast.error(result.error);
            } else {
                toast.success(result.message);
                router.refresh();
            }
        } catch (error) {
            if (error instanceof Error && error.message) {
                toast.error(error.message);
            } else {
                toast.error('Something went wrong during the reset.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            onClick={handleReset}
            disabled={loading}
            variant="outline"
            size="sm"
            className="border-red-900/50 bg-red-950/30 text-red-400 hover:bg-red-900/40 hover:text-red-300 hover:border-red-700/50"
        >
            {loading ? (
                <Loader2 className="w-4 h-4 animate-spin sm:mr-2" />
            ) : (
                <AlertTriangle className="w-4 h-4 sm:mr-2" />
            )}
            <span className="hidden sm:inline">{loading ? 'Resetting...' : 'Reset All'}</span>
        </Button>
    );
}
