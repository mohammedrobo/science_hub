import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function GuildLoading() {
    return (
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl animate-pulse">
            <div className="mb-8">
                <div className="h-8 w-24 bg-zinc-800 rounded mb-4" />
                <div className="h-10 w-48 bg-zinc-800 rounded mb-2" />
                <div className="h-5 w-64 bg-zinc-800/60 rounded" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="bg-zinc-900/50 border-zinc-800">
                        <CardHeader>
                            <div className="h-6 w-40 bg-zinc-800 rounded" />
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="h-4 w-full bg-zinc-800/60 rounded" />
                            <div className="h-4 w-3/4 bg-zinc-800/60 rounded" />
                            <div className="h-4 w-1/2 bg-zinc-800/60 rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
