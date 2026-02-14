'use client';

import { CHANGELOG } from '@/lib/data/changelog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Rocket, Calendar, ArrowLeft, Clock, Zap, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function timeAgo(dateStr: string): string {
    const now = new Date();
    const then = new Date(dateStr);
    const diff = now.getTime() - then.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}

export default function UpdatesPage() {
    return (
        <div className="min-h-screen bg-zinc-950 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-900">
                <div className="container mx-auto px-4 h-16 flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="shrink-0 text-zinc-400 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-fuchsia-400" />
                        <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
                            What&apos;s New
                        </h1>
                    </div>
                    <Badge variant="secondary" className="ml-auto bg-zinc-900 text-zinc-400 border-zinc-800 text-[10px]">
                        {CHANGELOG.length} updates
                    </Badge>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-2xl space-y-8">
                {CHANGELOG.map((entry, index) => {
                    const isLatest = index === 0;
                    const deployedAt = entry.deployedAt;
                    const isRecent = deployedAt && (Date.now() - new Date(deployedAt).getTime()) < 7 * 24 * 60 * 60 * 1000;

                    return (
                        <div key={entry.version} className="relative pl-6 sm:pl-8">
                            {/* Timeline Line */}
                            {index !== CHANGELOG.length - 1 && (
                                <div className="absolute left-[11px] sm:left-[15px] top-8 bottom-[-32px] w-[2px] bg-zinc-800" />
                            )}

                            {/* Timeline Dot */}
                            <div className={`
                                absolute left-0 top-1.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full border-4 border-zinc-950 flex items-center justify-center
                                ${isLatest ? 'bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.5)]' : 'bg-zinc-800'}
                            `}>
                                {isLatest ? <Rocket className="w-3 h-3 sm:w-4 sm:h-4 text-white" /> : <Zap className="w-2.5 h-2.5 text-zinc-500" />}
                            </div>

                            {/* Content Card */}
                            <Card className={`
                                border-zinc-800/50 transition-all duration-300
                                ${isLatest ? 'bg-zinc-900/50 shadow-lg shadow-violet-900/10 border-violet-500/20' : 'bg-zinc-900/20'}
                            `}>
                                <CardContent className="p-5 sm:p-6 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h2 className={`text-lg font-bold ${isLatest ? 'text-white' : 'text-zinc-300'}`}>
                                                    {entry.title}
                                                </h2>
                                                <Badge variant="outline" className="text-[10px] px-1.5 h-5 border-zinc-700 text-zinc-500 font-mono">
                                                    v{entry.version}
                                                </Badge>
                                                {isLatest && isRecent && (
                                                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20 text-[10px] px-2 h-5 animate-pulse">
                                                        🔥 NEW
                                                    </Badge>
                                                )}
                                                {isLatest && !isRecent && (
                                                    <Badge variant="secondary" className="bg-violet-500/10 text-violet-300 border-violet-500/20 text-[10px] px-2 h-5">
                                                        LATEST
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(entry.date)}
                                                </span>
                                                {deployedAt && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {timeAgo(deployedAt)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-px bg-zinc-800/50 w-full" />

                                    <ul className="space-y-3">
                                        {entry.changes.map((change, i) => (
                                            <li key={i} className="flex items-start gap-3 text-sm text-zinc-400 leading-relaxed group">
                                                <CheckCircle2 className={`
                                                    w-4 h-4 mt-0.5 shrink-0 transition-colors
                                                    ${isLatest ? 'text-emerald-500' : 'text-zinc-600'}
                                                `} />
                                                <span className="group-hover:text-zinc-300 transition-colors">{change}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
