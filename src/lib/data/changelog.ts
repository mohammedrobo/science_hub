export interface ChangeLogEntry {
    version: string;
    date: string;
    deployedAt?: string;
    title: string;
    changes: string[];
}

// Try to import auto-generated changelog from build step
// Falls back to manual entries for local dev
let generatedChangelog: ChangeLogEntry[] = [];
try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    generatedChangelog = require('./changelog-generated.json');
} catch {
    // File doesn't exist yet (first local dev run)
}

const MANUAL_CHANGELOG: ChangeLogEntry[] = [
    {
        version: '1.2.0',
        date: '2024-02-13',
        title: 'Performance & Offline Update',
        changes: [
            '🚀 3x Faster Page Loads: Removed heavy animations and optimized resources.',
            '📱 Offline Mode: The app now works better without internet.',
            '✨ Smoother Scrolling: Improved navigation experience.',
            '📥 Install Prompt: Easier way to install the app on your device.',
            '🔒 Enhanced Security: Upgraded backend connections.'
        ]
    }
];

// Merge: generated entries first, then manual ones (deduped by version)
const seenVersions = new Set<string>();
export const CHANGELOG: ChangeLogEntry[] = [];

for (const entry of [...generatedChangelog, ...MANUAL_CHANGELOG]) {
    if (!seenVersions.has(entry.version)) {
        seenVersions.add(entry.version);
        CHANGELOG.push(entry);
    }
}

// Ensure at least one entry
if (CHANGELOG.length === 0) {
    CHANGELOG.push({
        version: '1.0.0',
        date: new Date().toISOString().split('T')[0],
        title: 'Science Hub',
        changes: ['🚀 Science Hub is live!']
    });
}

export const LATEST_VERSION = CHANGELOG[0].version;
