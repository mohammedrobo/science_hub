'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Play,
  ListVideo,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Volume2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  buildEmbedUrl,
  buildDirectYouTubeLink,
  getYouTubeThumbnailUrl,
  THUMBNAIL_FALLBACK_CHAIN,
} from '@/lib/youtube-utils';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface VideoPlayerProps {
  url: string | null;
  title: string;
  parts?: { title: string; url: string }[];
}

type PlayerState = 'thumbnail' | 'loading' | 'playing' | 'error';

// ─── Thumbnail Component (Lite-YouTube pattern) ──────────────────────────────

function YouTubeThumbnail({
  videoUrl,
  title,
  onPlay,
}: {
  videoUrl: string;
  title: string;
  onPlay: () => void;
}) {
  const [thumbQualityIdx, setThumbQualityIdx] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  const thumbnailUrl = useMemo(() => {
    const quality = THUMBNAIL_FALLBACK_CHAIN[thumbQualityIdx];
    return getYouTubeThumbnailUrl(videoUrl, quality);
  }, [videoUrl, thumbQualityIdx]);

  const handleImageError = useCallback(() => {
    if (thumbQualityIdx < THUMBNAIL_FALLBACK_CHAIN.length - 1) {
      setThumbQualityIdx((prev) => prev + 1);
    }
  }, [thumbQualityIdx]);

  useEffect(() => {
    setThumbQualityIdx(0);
    setImageLoaded(false);
  }, [videoUrl]);

  return (
    <button
      onClick={onPlay}
      className="group relative w-full h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      aria-label={`Play ${title}`}
    >
      {!imageLoaded && (
        <Skeleton className="absolute inset-0 bg-zinc-800" />
      )}

      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt={`Thumbnail for ${title}`}
          className={cn(
            'w-full h-full object-cover transition-all duration-500',
            imageLoaded ? 'opacity-100' : 'opacity-0',
            'group-hover:scale-[1.02] group-focus-visible:scale-[1.02]'
          )}
          onLoad={() => setImageLoaded(true)}
          onError={handleImageError}
          loading="eager"
          decoding="async"
        />
      )}

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300" />

      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={cn(
            'w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center',
            'bg-primary/90 text-white shadow-2xl',
            'transition-all duration-300 ease-out',
            'group-hover:scale-110 group-hover:bg-primary group-hover:shadow-[0_0_40px_rgba(139,92,246,0.5)]',
            'group-focus-visible:scale-110 group-focus-visible:bg-primary'
          )}
        >
          <Play className="w-7 h-7 sm:w-9 sm:h-9 ml-1 fill-current" />
        </div>
      </div>

      {/* Title bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
        <p className="text-white text-sm sm:text-base font-medium truncate drop-shadow-lg">
          {title}
        </p>
      </div>
    </button>
  );
}

// ─── Error Fallback ──────────────────────────────────────────────────────────

function VideoErrorFallback({
  videoUrl,
  onRetry,
}: {
  videoUrl: string | null;
  onRetry: () => void;
}) {
  const directLink = videoUrl ? buildDirectYouTubeLink(videoUrl) : null;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/95 p-6 text-center">
      <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-red-400" />
      </div>
      <h3 className="text-white font-semibold text-lg mb-1">
        Video Unavailable
      </h3>
      <p className="text-zinc-400 text-sm mb-5 max-w-xs">
        This video couldn&apos;t be loaded. It may be private, restricted, or temporarily unavailable.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="border-zinc-700 hover:border-primary hover:text-primary gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
        {directLink && (
          <Button
            asChild
            variant="default"
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white gap-2"
          >
            <a
              href={directLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-4 h-4" />
              Watch on YouTube
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Loading Overlay ─────────────────────────────────────────────────────────

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative">
        <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center border border-primary/40">
          <Volume2 className="w-6 h-6 text-primary animate-pulse" />
        </div>
      </div>
      <p className="text-zinc-400 text-sm mt-4 animate-pulse">
        Loading video...
      </p>
    </div>
  );
}

// ─── Playlist Sidebar (Desktop) ──────────────────────────────────────────────

function PlaylistSidebar({
  parts,
  activeUrl,
  onSelect,
  isOpen,
  onToggle,
}: {
  parts: { title: string; url: string }[];
  activeUrl: string | null;
  onSelect: (url: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev < parts.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev > 0 ? prev - 1 : parts.length - 1
          );
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < parts.length) {
            const embedUrl = buildEmbedUrl(
              parts[focusedIndex].url,
              typeof window !== 'undefined'
                ? window.location.origin
                : undefined
            );
            if (embedUrl) onSelect(embedUrl);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onToggle();
          break;
      }
    },
    [focusedIndex, parts, onSelect, onToggle]
  );

  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const buttons = listRef.current.querySelectorAll('[data-part-btn]');
      buttons[focusedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [focusedIndex]);

  return (
    <>
      {/* Toggle Button — positioned at top to avoid YouTube bottom controls */}
      <button
        onClick={onToggle}
        className={cn(
          'absolute top-2 z-20',
          'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white',
          'p-2 rounded-l-lg border border-r-0 border-zinc-700 shadow-lg',
          'transition-all duration-300 ease-out',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          isOpen ? 'right-64' : 'right-0'
        )}
        title={isOpen ? 'Hide playlist' : 'Show playlist'}
        aria-label={isOpen ? 'Hide playlist' : 'Show playlist'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* Sidebar — overlay from the right so it doesn't break aspect-video */}
      <div
        className={cn(
          'absolute top-0 right-0 h-full z-10',
          'bg-zinc-900/95 backdrop-blur-sm border-l border-zinc-800 overflow-hidden',
          'transition-all duration-300 ease-out',
          isOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 pointer-events-none'
        )}
        role="navigation"
        aria-label="Video playlist"
        onKeyDown={handleKeyDown}
      >
        <div className="w-64 h-full overflow-y-auto custom-scrollbar" ref={listRef}>
          <div className="p-4 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-sm sticky top-0 z-10">
            <h4 className="font-bold text-sm text-zinc-300 flex items-center gap-2">
              <ListVideo className="w-4 h-4 text-primary" />
              Playlist
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {parts.length} video{parts.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex flex-col" role="listbox">
            {parts.map((part, idx) => {
              const partEmbedUrl = buildEmbedUrl(
                part.url,
                typeof window !== 'undefined'
                  ? window.location.origin
                  : undefined
              );
              const isActive = partEmbedUrl === activeUrl;
              const isFocused = focusedIndex === idx;

              return (
                <button
                  key={idx}
                  data-part-btn
                  onClick={() => partEmbedUrl && onSelect(partEmbedUrl)}
                  role="option"
                  aria-selected={isActive}
                  tabIndex={isFocused ? 0 : -1}
                  className={cn(
                    'text-left px-4 py-3 text-sm border-b border-zinc-800/50 transition-all duration-150',
                    'focus:outline-none focus-visible:bg-primary/10',
                    isActive
                      ? 'bg-primary/10 text-primary border-l-2 border-l-primary'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border-l-2 border-l-transparent',
                    isFocused && !isActive && 'bg-zinc-800/70'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold mt-0.5',
                        isActive
                          ? 'bg-primary text-white'
                          : 'bg-zinc-800 text-zinc-500'
                      )}
                    >
                      {isActive ? (
                        <Play className="w-3 h-3 fill-current" />
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium line-clamp-2 leading-snug">
                        {part.title}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Mobile Playlist Sheet ───────────────────────────────────────────────────

function MobilePlaylistBar({
  parts,
  activeUrl,
  onSelect,
}: {
  parts: { title: string; url: string }[];
  activeUrl: string | null;
  onSelect: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const activeIdx = parts.findIndex((p) => {
    const embedUrl = buildEmbedUrl(
      p.url,
      typeof window !== 'undefined' ? window.location.origin : undefined
    );
    return embedUrl === activeUrl;
  });
  const activePart = activeIdx >= 0 ? parts[activeIdx] : parts[0];
  const displayIdx = activeIdx >= 0 ? activeIdx : 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Bar overlays bottom of video — doesn't steal space from aspect-video */}
      <SheetTrigger asChild>
        <button
          className={cn(
            'absolute bottom-0 left-0 right-0 z-10',
            'w-full flex items-center gap-2.5 px-3 py-2',
            'bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800',
            'text-left transition-colors duration-150',
            'hover:bg-zinc-800/90 active:bg-zinc-800',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
            'touch-manipulation'
          )}
          aria-label={`Open playlist — playing part ${displayIdx + 1} of ${parts.length}`}
        >
          <span className="flex-shrink-0 w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
            <ListVideo className="w-3.5 h-3.5 text-primary" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-zinc-200 truncate font-medium leading-tight">
              {activePart?.title || 'Select video'}
            </p>
          </div>
          <span className="text-[10px] sm:text-xs text-zinc-500 tabular-nums flex-shrink-0 bg-zinc-800 px-1.5 py-0.5 rounded">
            {displayIdx + 1}/{parts.length}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="bg-zinc-900 border-zinc-800 max-h-[60vh] rounded-t-xl"
      >
        <SheetHeader className="pb-2">
          <SheetTitle className="text-zinc-200 flex items-center gap-2">
            <ListVideo className="w-5 h-5 text-primary" />
            Playlist · {parts.length} videos
          </SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto -mx-4 px-4 pb-4 max-h-[45vh] custom-scrollbar">
          <div className="flex flex-col gap-1">
            {parts.map((part, idx) => {
              const partEmbedUrl = buildEmbedUrl(
                part.url,
                typeof window !== 'undefined'
                  ? window.location.origin
                  : undefined
              );
              const isActive = partEmbedUrl === activeUrl;

              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (partEmbedUrl) {
                      onSelect(partEmbedUrl);
                      setOpen(false);
                    }
                  }}
                  className={cn(
                    'text-left px-4 py-3.5 text-sm rounded-lg transition-all duration-150',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    isActive
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'text-zinc-300 hover:bg-zinc-800 active:bg-zinc-700 border border-transparent'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold',
                        isActive
                          ? 'bg-primary text-white shadow-lg'
                          : 'bg-zinc-800 text-zinc-500'
                      )}
                    >
                      {isActive ? (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <div className="font-medium line-clamp-2">
                      {part.title}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main VideoPlayer Component ──────────────────────────────────────────────

export function VideoPlayer({ url, title, parts }: VideoPlayerProps) {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : undefined;

  // ── Memoized URL computation ───────────────────────────────────────────────
  const primaryEmbedUrl = useMemo(
    () => (url ? buildEmbedUrl(url, origin) : null),
    [url, origin]
  );

  const firstPartEmbedUrl = useMemo(
    () =>
      parts && parts.length > 0
        ? buildEmbedUrl(parts[0].url, origin)
        : null,
    [parts, origin]
  );

  // ── State ──────────────────────────────────────────────────────────────────
  const [activeUrl, setActiveUrl] = useState<string | null>(
    primaryEmbedUrl ?? firstPartEmbedUrl
  );
  const [playerState, setPlayerState] = useState<PlayerState>('thumbnail');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const hasParts = parts && parts.length > 0;
  const currentRawUrl =
    url ??
    (hasParts
      ? parts.find((p) => {
          const embed = buildEmbedUrl(p.url, origin);
          return embed === activeUrl;
        })?.url ?? parts[0].url
      : null);

  // ── Sync URL when props change ─────────────────────────────────────────────
  useEffect(() => {
    const newUrl = primaryEmbedUrl ?? firstPartEmbedUrl;
    setActiveUrl(newUrl);
    setPlayerState('thumbnail');
    setRetryCount(0);
  }, [primaryEmbedUrl, firstPartEmbedUrl]);

  // ── Responsive detection with matchMedia ───────────────────────────────────
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (!e.matches) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    handler(mql);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handlePlay = useCallback(() => {
    setPlayerState('loading');
  }, []);

  const handleIframeLoad = useCallback(() => {
    setPlayerState('playing');
  }, []);

  const handleRetry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
    setPlayerState('loading');
  }, []);

  const handleIframeError = useCallback(() => {
    setPlayerState('error');
    toast.error('Failed to load video', {
      description: 'The video may be blocked or unavailable.',
      action: {
        label: 'Retry',
        onClick: () => handleRetry(),
      },
    });
  }, [handleRetry]);

  const handlePartSelect = useCallback(
    (embedUrl: string) => {
      setActiveUrl(embedUrl);
      setPlayerState('thumbnail');
      setRetryCount(0);
    },
    []
  );

  // ── No video available ─────────────────────────────────────────────────────
  if (!activeUrl && !hasParts) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/80 text-center p-6">
        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
          <AlertTriangle className="w-5 h-5 text-zinc-500" />
        </div>
        <p className="text-zinc-400 text-sm">No video available for this lesson</p>
        {currentRawUrl && (
          <a
            href={buildDirectYouTubeLink(currentRawUrl) ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 text-xs text-primary hover:underline flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Try opening on YouTube
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Main Video Area — takes full space, overlays sit on top */}
      <div className="w-full h-full relative">
        {/* Thumbnail state (lite-youtube) */}
        {playerState === 'thumbnail' && activeUrl && currentRawUrl && (
          <YouTubeThumbnail
            videoUrl={currentRawUrl}
            title={title}
            onPlay={handlePlay}
          />
        )}

        {/* Loading + iframe */}
        {(playerState === 'loading' || playerState === 'playing') &&
          activeUrl && (
            <div className="relative w-full h-full">
              {playerState === 'loading' && <LoadingOverlay />}
              <iframe
                ref={iframeRef}
                key={`${activeUrl}-${retryCount}`}
                width="100%"
                height="100%"
                src={activeUrl}
                title={title}
                loading="eager"
                referrerPolicy="no-referrer-when-downgrade"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
                allowFullScreen
                className="w-full h-full"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
              />
            </div>
          )}

        {/* Error state */}
        {playerState === 'error' && (
          <VideoErrorFallback
            videoUrl={currentRawUrl}
            onRetry={handleRetry}
          />
        )}

        {/* Watch on YouTube floating button (visible when playing) */}
        {playerState === 'playing' && currentRawUrl && (
          <a
            href={buildDirectYouTubeLink(currentRawUrl) ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'absolute top-3 left-3 z-20',
              'bg-black/60 hover:bg-black/80 text-zinc-300 hover:text-white',
              'px-2.5 py-1.5 rounded-md text-xs font-medium',
              'transition-all duration-200 backdrop-blur-sm',
              'opacity-0 hover:opacity-100 focus:opacity-100',
              '[@media(pointer:coarse)]:opacity-70'
            )}
            title="Watch on YouTube"
          >
            <ExternalLink className="w-3 h-3 inline mr-1" />
            YouTube
          </a>
        )}
      </div>

      {/* Playlist overlays — absolutely positioned, don't break aspect-video */}
      {hasParts && (
        <>
          {/* Desktop: sidebar overlay from right */}
          <div className="hidden lg:block">
            <PlaylistSidebar
              parts={parts}
              activeUrl={activeUrl}
              onSelect={handlePartSelect}
              isOpen={sidebarOpen}
              onToggle={() => setSidebarOpen((prev) => !prev)}
            />
          </div>

          {/* Mobile/Tablet: bar overlay at bottom */}
          <div className="lg:hidden">
            <MobilePlaylistBar
              parts={parts}
              activeUrl={activeUrl}
              onSelect={handlePartSelect}
            />
          </div>
        </>
      )}
    </div>
  );
}
