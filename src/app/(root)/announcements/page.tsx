import { readSession } from '@/lib/auth/session-read';
import AnnouncementsClient from './AnnouncementsClient';
import { redirect } from 'next/navigation';
import { MOCK_COURSES } from '@/lib/data/mocks';
import { cookies } from 'next/headers';

export default async function AnnouncementsPage() {
    const session = await readSession();
    if (!session) redirect('/login');

    const userRole = (session.role || 'student') as 'super_admin' | 'admin' | 'leader' | 'student' | 'doctor';

    // Extract section and group from username pattern like A_A1-1-0444
    const sectionMatch = session.username?.match(/^([A-D])_([A-D]\d)/i);
    const userSection = sectionMatch ? sectionMatch[2].toUpperCase() : null;
    const userGroup = sectionMatch ? sectionMatch[1].toUpperCase() : null;

    // Get current semester from cookie (default to 2)
    const cookieStore = await cookies();
    const semester = parseInt(cookieStore.get('semester')?.value || '2', 10);
    const courses = MOCK_COURSES
        .filter(c => c.semester === semester)
        .map(c => ({ id: c.id, name: c.name, code: c.code }));

    return (
        <AnnouncementsClient
            userRole={userRole}
            userSection={userSection}
            userGroup={userGroup}
            userName={session.username}
            courses={courses}
        />
    );
}
