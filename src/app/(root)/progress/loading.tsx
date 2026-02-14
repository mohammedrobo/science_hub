import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function ProgressLoading() {
    return (
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-5xl">
            {/* Back button */}
            <Skeleton className="h-9 w-36 mb-6" />

            {/* Header */}
            <div className="mb-8">
                <Skeleton className="h-10 w-64 mb-2" />
                <Skeleton className="h-5 w-80" />
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Skeleton className="h-10 w-full sm:w-64" />
                <Skeleton className="h-10 w-full sm:w-48" />
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="pt-5 pb-4">
                            <div className="flex items-start gap-3">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-6 w-20" />
                                    <Skeleton className="h-3 w-12" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main chart */}
            <Card className="bg-zinc-900/50 border-zinc-800 mb-6">
                <CardHeader>
                    <Skeleton className="h-5 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[360px] w-full rounded-lg" />
                </CardContent>
            </Card>

            {/* Secondary charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[...Array(2)].map((_, i) => (
                    <Card key={i} className="bg-zinc-900/50 border-zinc-800">
                        <CardHeader>
                            <Skeleton className="h-5 w-36" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-[280px] w-full rounded-lg" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
