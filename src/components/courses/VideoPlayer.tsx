import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
    url: string | null;
    title: string;
    parts?: { title: string; url: string }[];
}

export function VideoPlayer({ url, title, parts }: VideoPlayerProps) {
    // Extract video ID or Playlist ID with optimized embed params
    const getEmbedUrl = (inputUrl: string) => {
        if (!inputUrl) return null;
        const urlStr = inputUrl.trim();

        // Optimized params for better performance and privacy (prevents sign-in prompts)
        const params = 'rel=0&modestbranding=1&playsinline=1&origin=' + (typeof window !== 'undefined' ? window.location.origin : '');

        if (urlStr.includes('list=')) {
            const listMatch = urlStr.match(/[?&]list=([^#&?]+)/);
            if (listMatch && listMatch[1]) {
                return `https://www.youtube-nocookie.com/embed/videoseries?list=${listMatch[1]}&${params}`;
            }
        }

        const videoIdMatch = urlStr.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=|\/shorts\/|\/live\/))([\w\-]{10,12})\b/);

        if (videoIdMatch && videoIdMatch[1]) {
            return `https://www.youtube-nocookie.com/embed/${videoIdMatch[1]}?${params}`;
        }

        return null;
    };

    const embedUrl = getEmbedUrl(url || '');
    const [activeUrl, setActiveUrl] = useState<string | null>(embedUrl);
    const hasParts = parts && parts.length > 0;
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Handle responsive sidebar after hydration
    useEffect(() => {
        setSidebarOpen(window.innerWidth >= 768);
    }, []);

    useEffect(() => {
        if (url) {
            setActiveUrl(getEmbedUrl(url));
        } else if (parts && parts.length > 0) {
            setActiveUrl(getEmbedUrl(parts[0].url));
        }
    }, [url, parts]);

    if (!activeUrl && !hasParts) {
        return (
            <div className="aspect-video bg-muted/30 flex flex-col items-center justify-center text-muted-foreground border rounded-lg">
                <p>No video available for this lesson</p>
            </div>
        );
    }

    return (
        <div className="relative aspect-video w-full rounded-lg overflow-hidden border bg-black shadow-md flex">
            {/* Main Video Area */}
            <div className="flex-1 h-full relative">
                {activeUrl ? (
                    <iframe
                        width="100%"
                        height="100%"
                        src={activeUrl}
                        title={title}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="w-full h-full"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-zinc-900 border-r border-zinc-800">
                        <p>Select a part to begin</p>
                    </div>
                )}
            </div>

            {/* Playlist Sidebar - Pure CSS transitions */}
            {hasParts && (
                <>
                    {/* Toggle Button */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className={cn(
                            "absolute top-1/2 -translate-y-1/2 z-20",
                            "bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300",
                            "p-2 rounded-l-lg border border-r-0 border-zinc-700 shadow-lg",
                            "transition-all duration-200",
                            sidebarOpen ? "right-64" : "right-0"
                        )}
                        title={sidebarOpen ? "Hide parts" : "Show parts"}
                    >
                        {sidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>

                    {/* Sidebar with CSS transition */}
                    <div
                        className={cn(
                            "bg-zinc-900 border-l border-zinc-800 overflow-hidden flex-shrink-0",
                            "transition-all duration-300 ease-out",
                            sidebarOpen ? "w-64 opacity-100" : "w-0 opacity-0"
                        )}
                    >
                        <div className="w-64 h-full overflow-y-auto custom-scrollbar">
                            <div className="p-4 border-b border-zinc-800 bg-zinc-900 sticky top-0 z-10">
                                <h4 className="font-bold text-sm text-zinc-300">Parts</h4>
                                <p className="text-xs text-muted-foreground">{parts?.length} videos</p>
                            </div>
                            <div className="flex flex-col">
                                {parts?.map((part, idx) => {
                                    const partEmbedUrl = getEmbedUrl(part.url);
                                    const isActive = partEmbedUrl === activeUrl;

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => partEmbedUrl && setActiveUrl(partEmbedUrl)}
                                            className={cn(
                                                "text-left px-4 py-3 text-sm border-b border-zinc-800/50 transition-colors duration-150",
                                                isActive
                                                    ? 'bg-primary/10 text-primary border-l-2 border-l-primary'
                                                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border-l-2 border-l-transparent'
                                            )}
                                        >
                                            <div className="font-medium line-clamp-2">{part.title}</div>
                                            <div className="text-[10px] opacity-70 mt-1">Part {idx + 1}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
