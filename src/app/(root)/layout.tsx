import { Header } from '@/components/layout/Header';

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />
            <main className="flex-1 w-full">
                {children}
            </main>
            <footer className="py-6 text-center text-sm text-muted-foreground border-t mt-auto">
                © 2025 Science Hub. University Learning Platform.
            </footer>
        </div>
    );
}
