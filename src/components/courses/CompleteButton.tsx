'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { markContentAsCompleted } from '@/app/actions/progress';
import { toast } from 'sonner';

export function CompleteButton({ lessonId }: { lessonId: string }) {
    const [isLoading, setIsLoading] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    const handleComplete = async () => {
        setIsLoading(true);
        try {
            const result = await markContentAsCompleted(lessonId, 'lesson', 50);
            if (result.error) {
                toast.error(result.error);
            } else {
                setIsCompleted(true);
                const msg = result.message === 'Already completed'
                    ? 'Already completed!'
                    : `Lesson Completed! +${result.xpEarned} XP`;
                toast.success(msg);
            }
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            onClick={handleComplete}
            disabled={isLoading || isCompleted}
            variant="outline"
            size="icon"
            className={`h-10 w-10 border-zinc-700 hover:border-green-500 hover:text-green-500 ${isCompleted ? 'text-green-500 border-green-500 bg-green-500/10' : ''}`}
            title="Mark as Complete"
        >
            {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <CheckCircle className="h-4 w-4" />
            )}
        </Button>
    );
}
