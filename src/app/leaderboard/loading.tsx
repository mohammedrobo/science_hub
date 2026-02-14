import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function LeaderboardLoading() {
    return (
        <div className="container mx-auto py-6 sm:py-10 px-3 sm:px-4 max-w-5xl animate-pulse">
            <div className="mb-8">
                <div className="h-8 w-28 bg-zinc-800 rounded mb-4" />
                <div className="text-center">
                    <div className="h-10 w-72 bg-zinc-800 rounded mx-auto mb-3" />
                    <div className="h-5 w-56 bg-zinc-800/60 rounded mx-auto" />
                </div>
            </div>

            {/* Podium Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="bg-zinc-900/50 border-zinc-800">
                        <CardHeader className="text-center pb-2">
                            <div className="w-16 h-16 rounded-full bg-zinc-800 mx-auto mb-2" />
                            <div className="h-6 w-32 bg-zinc-800 rounded mx-auto" />
                        </CardHeader>
                        <CardContent className="text-center">
                            <div className="h-5 w-20 bg-zinc-800/60 rounded mx-auto mb-2" />
                            <div className="h-7 w-24 bg-zinc-800 rounded mx-auto" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Table Skeleton */}
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="pt-6 space-y-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <div className="w-6 h-6 bg-zinc-800 rounded" />
                            <div className="w-10 h-10 rounded-full bg-zinc-800" />
                            <div className="flex-1 h-5 bg-zinc-800 rounded" />
                            <div className="w-20 h-5 bg-zinc-800/60 rounded" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
