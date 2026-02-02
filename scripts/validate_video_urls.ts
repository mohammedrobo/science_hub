
import { MOCK_LESSONS } from '../src/lib/constants';
import https from 'https';

// Regex from VideoPlayer.tsx
const YOUTUBE_REGEX = /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=|\/shorts\/|\/live\/))([\w\-]{10,12})\b/;
const PLAYLIST_REGEX = /[?&]list=([^#&?]+)/;

async function checkOEmbed(videoId: string): Promise<{ authorized: boolean; error?: string }> {
    return new Promise((resolve) => {
        const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        https.get(url, (res) => {
            if (res.statusCode === 200) {
                resolve({ authorized: true });
            } else if (res.statusCode === 401 || res.statusCode === 403) {
                resolve({ authorized: false, error: 'Private/Restricted' });
            } else if (res.statusCode === 404) {
                resolve({ authorized: false, error: 'Not Found' });
            } else {
                resolve({ authorized: false, error: `Status ${res.statusCode}` });
            }
        }).on('error', (e) => {
            resolve({ authorized: false, error: e.message });
        });
    });
}

async function validate() {
    console.log('--- Starting Video Validation ---');
    const allLessons = Object.values(MOCK_LESSONS).flat();
    let errors = 0;
    let checked = 0;

    for (const lesson of allLessons) {
        // Collect all URLs for this lesson
        const urlsToCheck: { label: string; url: string | null }[] = [];

        if (lesson.video_url) {
            urlsToCheck.push({ label: `Main`, url: lesson.video_url });
        }

        if (lesson.video_parts) {
            lesson.video_parts.forEach((p, i) => {
                urlsToCheck.push({ label: `Part ${i + 1}`, url: p.url });
            });
        }

        for (const item of urlsToCheck) {
            checked++;
            const url = item.url?.trim();
            if (!url) continue;

            // 1. Check Regex
            const isPlaylist = url.includes('list=');
            const videoMatch = url.match(YOUTUBE_REGEX);
            const playlistMatch = url.match(PLAYLIST_REGEX);

            if (!videoMatch && !isPlaylist) {
                console.error(`[FAIL REGEX] [${lesson.course_id}] ${lesson.title} (${item.label}): ${url}`);
                errors++;
                continue;
            }

            // 2. Check Availability (Only for single videos, playlists are harder to check via oEmbed simply)
            if (videoMatch && videoMatch[1]) {
                const videoId = videoMatch[1];
                const status = await checkOEmbed(videoId);
                if (!status.authorized) {
                    console.error(`[FAIL API] [${lesson.course_id}] ${lesson.title} (${item.label}): ${status.error} (ID: ${videoId})`);
                    errors++;
                } else {
                    // console.log(`[OK] ${videoId}`);
                }
            }
        }
    }

    console.log(`--- Validation Complete ---`);
    console.log(`Checked ${checked} links.`);
    console.log(`Found ${errors} errors.`);
}

validate();
