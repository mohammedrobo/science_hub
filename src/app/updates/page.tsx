'use client';

import { CHANGELOG } from '@/lib/data/changelog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Rocket, Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
                    <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
                        What's New
                    </h1>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-2xl space-y-8">
                {CHANGELOG.map((entry, index) => {
                    const isLatest = index === 0;

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
                                {isLatest && <Rocket className="w-3 h-3 sm:w-4 sm:h-4 text-white" />}
                            </div>

                            {/* Content Card */}
                            <Card className={`
                                border-zinc-800/50 transition-all duration-300
                                ${isLatest ? 'bg-zinc-900/50 shadow-lg shadow-violet-900/10 border-violet-500/20' : 'bg-zinc-900/20'}
                            `}>
                                <CardContent className="p-5 sm:p-6 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h2 className={`text-lg font-bold ${isLatest ? 'text-white' : 'text-zinc-300'}`}>
                                                    v{entry.version}
                                                </h2>
                                                {isLatest && (
                                                    <Badge variant="secondary" className="bg-violet-500/10 text-violet-300 border-violet-500/20 text-[10px] px-2 h-5">
                                                        LATEST
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                <Calendar className="w-3 h-3" />
                                                <span>{entry.date}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-px bg-zinc-800/50 w-full" />

                                    <div className="space-y-2">
                                        <h3 className="font-medium text-zinc-200 text-sm">{entry.title}</h3>
                                        <ul className="space-y-3 pt-2">
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
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
