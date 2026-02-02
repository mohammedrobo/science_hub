import { getSession } from '@/app/login/actions';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    if (session?.role !== 'admin') {
        redirect('/');
    }

    return (
        <>
            {children}
        </>
    );
}
