import { Loader2 } from 'lucide-react';

export default function AdminLoading() {
    return (
        <div className="container mx-auto py-10 px-4">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                        Batch Master Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-1">Loading student registry...</p>
                </div>
            </div>

            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="ml-3 text-zinc-400">Loading all students...</span>
            </div>
        </div>
    );
}
