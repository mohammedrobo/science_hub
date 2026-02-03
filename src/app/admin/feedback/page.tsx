import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { FeedbackList } from './FeedbackList';

export const metadata: Metadata = {
    title: 'Feedback - Admin | Science Hub',
    description: 'View and manage user feedback',
};

export default async function FeedbackAdminPage() {
    const session = await getSession();
    
    if (!session) {
        redirect('/login');
    }
    
    if (session.role !== 'admin') {
        redirect('/');
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">📬 User Feedback</h1>
                    <p className="text-zinc-400">View and manage bug reports, ideas, and questions from users</p>
                </div>

                {/* Feedback List */}
                <FeedbackList />
            </div>
        </main>
    );
}
