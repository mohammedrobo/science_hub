import { FileText, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PDFViewerProps {
    url: string;
    title: string;
}

export function PDFViewer({ url, title }: PDFViewerProps) {
    return (
        <Card>
            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg text-red-600 dark:text-red-400">
                        <FileText className="h-8 w-8" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg hover:underline cursor-pointer">
                            <a href={url} target="_blank" rel="noopener noreferrer">{title}</a>
                        </h3>
                        <p className="text-sm text-muted-foreground">PDF Document</p>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" size="sm" asChild className="flex-1 md:flex-none">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open
                        </a>
                    </Button>
                    <Button size="sm" asChild className="flex-1 md:flex-none">
                        <a href={url} download>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                        </a>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
