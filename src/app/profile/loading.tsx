import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function ProfileLoading() {
    return (
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl animate-pulse">
            <div className="h-8 w-32 bg-zinc-800 rounded mb-6" />
            <div className="mb-8">
                <div className="h-10 w-64 bg-zinc-800 rounded mb-2" />
                <div className="h-5 w-48 bg-zinc-800/60 rounded" />
            </div>

            {/* Profile Picture Skeleton */}
            <Card className="mb-6 bg-zinc-900/50 border-zinc-800">
                <CardContent className="pt-6 flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-zinc-800" />
                    <div className="space-y-2">
                        <div className="h-5 w-40 bg-zinc-800 rounded" />
                        <div className="h-4 w-24 bg-zinc-800/60 rounded" />
                    </div>
                </CardContent>
            </Card>

            {/* Rank Card Skeleton */}
            <Card className="mb-6 bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                    <div className="h-7 w-40 bg-zinc-800 rounded" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-6 mb-6">
                        <div className="w-24 h-24 rounded-2xl bg-zinc-800" />
                        <div className="space-y-2 flex-1">
                            <div className="h-8 w-48 bg-zinc-800 rounded" />
                            <div className="h-4 w-32 bg-zinc-800/60 rounded" />
                        </div>
                    </div>
                    <div className="h-3 w-full bg-zinc-800 rounded-full" />
                </CardContent>
            </Card>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i} className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-zinc-800" />
                                <div className="space-y-2">
                                    <div className="h-3 w-20 bg-zinc-800/60 rounded" />
                                    <div className="h-6 w-16 bg-zinc-800 rounded" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
