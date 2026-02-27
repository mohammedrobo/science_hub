import { Header } from '@/components/layout/Header';
import { SessionGuard } from '@/components/auth/SessionGuard';
import { readSession } from '@/lib/auth/session-read';
import { getTranslations } from 'next-intl/server';

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await readSession();
    const t = await getTranslations('common');
    
    return (
        <SessionGuard sessionToken={session?.sessionToken}>
            <div className="min-h-screen bg-background flex flex-col">
                <Header session={session} />
                <main className="flex-1 w-full">
                    {children}
                </main>
                <footer className="py-6 text-center text-sm text-muted-foreground border-t mt-auto">
                    {t('copyright')}
                </footer>
            </div>
        </SessionGuard>
    );
}
