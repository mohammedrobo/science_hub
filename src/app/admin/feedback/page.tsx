import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth/session-read';
import { FeedbackList } from './FeedbackList';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Feedback - Admin | Science Hub',
    description: 'View and manage user feedback',
};

export default async function FeedbackAdminPage() {
    const session = await readSession();

    if (!session) {
        redirect('/login');
    }

    if (session.role !== 'super_admin') {
        redirect('/');
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">📬 User Feedback</h1>
                        <p className="text-zinc-400 text-sm sm:text-base">View and manage bug reports, ideas, and questions from users</p>
                    </div>
                    <Link href="/admin">
                        <Button variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white w-full sm:w-auto">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Button>
                    </Link>
                </div>

                {/* Feedback List */}
                <FeedbackList />
            </div>
        </main>
    );
}
