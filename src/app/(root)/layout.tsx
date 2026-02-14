import { Header } from '@/components/layout/Header';
import { SessionGuard } from '@/components/auth/SessionGuard';
import { readSession } from '@/lib/auth/session-read';

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await readSession();
    
    return (
        <SessionGuard sessionToken={session?.sessionToken}>
            <div className="min-h-screen bg-background flex flex-col">
                <Header />
                <main className="flex-1 w-full">
                    {children}
                </main>
                <footer className="py-6 text-center text-sm text-muted-foreground border-t mt-auto">
                    © 2025 Science Hub. University Learning Platform.
                </footer>
            </div>
        </SessionGuard>
    );
}
