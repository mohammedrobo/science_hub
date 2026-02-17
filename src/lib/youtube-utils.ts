/**
 * YouTube URL Utilities
 *
 * Centralized helpers for parsing, validating, and building YouTube URLs.
 * Eliminates regex duplication across VideoPlayer, scripts, and validators.
 */

// ─── Regex Patterns ──────────────────────────────────────────────────────────

/** Matches a YouTube video ID from any standard URL format */
const VIDEO_ID_REGEX =
  /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=|\/shorts\/|\/live\/))([\w-]{10,12})\b/;

/** Matches a YouTube playlist ID from a URL */
const PLAYLIST_ID_REGEX = /[?&]list=([^#&?]+)/;

// ─── Extractors ──────────────────────────────────────────────────────────────

/**
 * Extract the video ID from any YouTube URL variant.
 * Supports: watch, embed, shorts, live, youtu.be, etc.
 */
export function extractVideoId(url: string): string | null {
  if (!url) return null;
  const match = url.trim().match(VIDEO_ID_REGEX);
  return match?.[1] ?? null;
}

/**
 * Extract the playlist ID from a YouTube URL.
 */
export function extractPlaylistId(url: string): string | null {
  if (!url) return null;
  const match = url.trim().match(PLAYLIST_ID_REGEX);
  return match?.[1] ?? null;
}

// ─── URL Builders ────────────────────────────────────────────────────────────

/** Standard embed params for privacy-enhanced mode */
function getEmbedParams(origin?: string): string {
  const base = 'rel=0&modestbranding=1&playsinline=1';
  if (origin) return `${base}&origin=${encodeURIComponent(origin)}`;
  return base;
}

/**
 * Build a privacy-enhanced embed URL (youtube-nocookie.com).
 * Returns null if the input URL is invalid.
 */
export function buildEmbedUrl(
  inputUrl: string,
  origin?: string
): string | null {
  if (!inputUrl) return null;
  const trimmed = inputUrl.trim();
  const params = getEmbedParams(origin);

  // Playlist URL
  const playlistId = extractPlaylistId(trimmed);
  if (playlistId) {
    return `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}&${params}`;
  }

  // Single video URL
  const videoId = extractVideoId(trimmed);
  if (videoId) {
    return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
  }

  return null;
}

/**
 * Build a direct YouTube watch link (for fallback "Open in YouTube" buttons).
 */
export function buildDirectYouTubeLink(url: string): string | null {
  if (!url) return null;
  const videoId = extractVideoId(url);
  if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
  const playlistId = extractPlaylistId(url);
  if (playlistId)
    return `https://www.youtube.com/playlist?list=${playlistId}`;
  return url; // return raw URL as last resort
}

// ─── Thumbnails ──────────────────────────────────────────────────────────────

/** Thumbnail quality tiers available from YouTube */
export type ThumbnailQuality =
  | 'maxresdefault' // 1280×720 — may 404 for old videos
  | 'sddefault'     // 640×480
  | 'hqdefault'     // 480×360
  | 'mqdefault'     // 320×180
  | 'default';      // 120×90

/**
 * Get a YouTube thumbnail URL for a given video URL.
 * Falls back through quality tiers at render-time via <img> onError.
 */
export function getYouTubeThumbnailUrl(
  url: string,
  quality: ThumbnailQuality = 'maxresdefault'
): string | null {
  const videoId = extractVideoId(url);
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/** All thumbnail quality tiers in descending order (for fallback chain) */
export const THUMBNAIL_FALLBACK_CHAIN: ThumbnailQuality[] = [
  'maxresdefault',
  'sddefault',
  'hqdefault',
  'mqdefault',
  'default',
];

// ─── Validators ──────────────────────────────────────────────────────────────

/**
 * Check whether a URL is a valid, parseable YouTube URL.
 */
export function isValidYouTubeUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  return extractVideoId(trimmed) !== null || extractPlaylistId(trimmed) !== null;
}

/**
 * Sanitize a YouTube URL — returns the embed URL or null if invalid.
 * Useful in server-side validation pipelines.
 */
export function sanitizeYouTubeUrl(url: string): string | null {
  if (!isValidYouTubeUrl(url)) return null;
  return buildEmbedUrl(url);
}
