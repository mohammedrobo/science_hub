export interface ChangeLogEntry {
    version: string;
    date: string;
    title: string;
    changes: string[];
}

export const CHANGELOG: ChangeLogEntry[] = [
    {
        version: '1.2.0',
        date: new Date().toISOString().split('T')[0],
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

export const LATEST_VERSION = CHANGELOG[0].version;
