import { GpaCalculator } from "@/components/tools/GpaCalculator";

export default function GpaPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-violet-950/10 to-zinc-950 flex flex-col items-center justify-center p-4">
            <GpaCalculator />
        </div>
    );
}
