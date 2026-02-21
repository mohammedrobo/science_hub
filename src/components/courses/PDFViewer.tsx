import { FileText, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PDFViewerProps {
    url: string;
    title: string;
}

export function PDFViewer({ url, title }: PDFViewerProps) {
    return (
        <div className="glass-card glow-hover rounded-xl overflow-hidden transition-all duration-300">
            <div className="p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 p-3 rounded-xl text-red-400 border border-red-500/20 flex-shrink-0">
                        <FileText className="h-7 w-7" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg text-zinc-100 hover:text-violet-300 transition-colors cursor-pointer">
                            <a href={url} target="_blank" rel="noopener noreferrer">{title}</a>
                        </h3>
                        <p className="text-sm text-zinc-500">PDF Document</p>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" size="sm" asChild className="flex-1 md:flex-none rounded-xl border-zinc-700/60 hover:border-violet-500/40 hover:text-violet-400 transition-all">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open
                        </a>
                    </Button>
                    <Button size="sm" asChild className="flex-1 md:flex-none rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all">
                        <a href={url} download>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                        </a>
                    </Button>
                </div>
            </div>
        </div>
    );
}
