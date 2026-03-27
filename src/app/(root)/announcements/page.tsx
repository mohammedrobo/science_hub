import { readSession } from '@/lib/auth/session-read';
import AnnouncementsClient from './AnnouncementsClient';
import { redirect } from 'next/navigation';

export default async function AnnouncementsPage() {
    const session = await readSession();
    if (!session) redirect('/login');

    const userRole = (session.role || 'student') as 'super_admin' | 'admin' | 'leader' | 'student';

    // Extract section from username pattern like A_A1-1-0444
    const sectionMatch = session.username?.match(/^[A-D]_([A-D]\d)/i);
    const userSection = sectionMatch ? sectionMatch[1].toUpperCase() : null;

    return (
        <AnnouncementsClient
            userRole={userRole}
            userSection={userSection}
            userName={session.username}
        />
    );
}
