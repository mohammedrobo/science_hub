import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CourseCardSkeleton() {
    return (
        <Card className="h-full overflow-hidden border-zinc-800 bg-card">
            <div className="w-full h-32 relative">
                <Skeleton className="w-full h-full bg-zinc-800" />
            </div>

            <CardHeader className="pt-4 pb-2">
                <Skeleton className="h-6 w-3/4 bg-zinc-800 mb-2" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-4 w-full bg-zinc-800 mb-2" />
                <Skeleton className="h-4 w-2/3 bg-zinc-800 mb-4" />
                <Skeleton className="h-4 w-24 bg-zinc-800" />
            </CardContent>
        </Card>
    );
}

export function CourseGridSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
                <CourseCardSkeleton key={i} />
            ))}
        </div>
    );
}
