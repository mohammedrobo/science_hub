import { AIChat } from '@/components/ai/AIChat';

export const metadata = {
    title: 'AI Assistant | Science Hub',
    description: 'Your personal AI study companion'
};

export default function AIPage() {
    return (
        <div className="container mx-auto py-6 sm:py-10 px-3 sm:px-4 min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center space-y-6 sm:space-y-8">
            <div className="text-center space-y-4 max-w-2xl">
                <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-500">
                    AI Assistant
                </h1>
                <p className="text-lg text-muted-foreground">
                    Ask questions, get explanations, and find study materials instantly.
                </p>
            </div>

            <div className="w-full">
                <AIChat />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl text-sm text-muted-foreground">
                <div className="p-4 rounded-lg bg-card border border-border shadow-sm">
                    <strong className="block text-foreground mb-1">Course Guidance</strong>
                    Ask "What should I study for C101?" to get relevant lectures.
                </div>
                <div className="p-4 rounded-lg bg-card border border-border shadow-sm">
                    <strong className="block text-foreground mb-1">Concept Explanation</strong>
                    Try "Explain the Second Law of Thermodynamics" for a quick summary.
                </div>
                <div className="p-4 rounded-lg bg-card border border-border shadow-sm">
                    <strong className="block text-foreground mb-1">Quiz Help</strong>
                    Ask "Are there quizes for G101?" to find practice tests.
                </div>
            </div>
        </div>
    );
}
