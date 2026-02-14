export default function ScheduleLoading() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4 md:p-8 animate-pulse">
            <div className="max-w-4xl mx-auto mb-8">
                <div className="h-5 w-20 bg-zinc-800 rounded mb-4" />
                <div className="h-9 w-64 bg-zinc-800 rounded" />
            </div>

            {/* Day Tabs Skeleton */}
            <div className="max-w-4xl mx-auto mb-6">
                <div className="flex gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-10 w-20 bg-zinc-800 rounded-lg" />
                    ))}
                </div>
            </div>

            {/* Schedule Cards Skeleton */}
            <div className="max-w-4xl mx-auto space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                        <div className="flex items-start justify-between">
                            <div className="space-y-2">
                                <div className="h-6 w-32 bg-zinc-800 rounded" />
                                <div className="h-4 w-20 bg-zinc-800/60 rounded" />
                            </div>
                            <div className="space-y-2 text-right">
                                <div className="h-4 w-28 bg-zinc-800 rounded" />
                                <div className="h-4 w-16 bg-zinc-800/60 rounded" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
