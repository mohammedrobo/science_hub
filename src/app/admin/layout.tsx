import { readSession } from '@/lib/auth/session-read';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await readSession();

    if (!session?.role || !['super_admin', 'admin'].includes(session.role)) {
        redirect('/');
    }

    return (
        <>
            {children}
        </>
    );
}
