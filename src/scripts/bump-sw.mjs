import fs from 'fs';
import path from 'path';

const SW_PATH = path.join(process.cwd(), 'public', 'sw.js');

// ──────────────────────────────────────────
// 1. Bump service worker cache version
// ──────────────────────────────────────────
try {
    let content = fs.readFileSync(SW_PATH, 'utf8');
    const newVersion = `v${Date.now()}`;
    const regex = /const CACHE_NAME = 'science-hub-v[^']+';/;

    if (regex.test(content)) {
        const newContent = content.replace(regex, `const CACHE_NAME = 'science-hub-${newVersion}';`);
        fs.writeFileSync(SW_PATH, newContent);
        console.log(`✅ Service Worker cache bumped to: science-hub-${newVersion}`);
    } else {
        console.error('❌ Could not find CACHE_NAME definition in sw.js');
        process.exit(1);
    }
} catch (error) {
    console.error('❌ Error bumping SW version:', error);
    process.exit(1);
}

// ──────────────────────────────────────────
// 2. Changelog is now manually curated in
//    src/lib/data/changelog.ts
//    (No more auto-generation from git commits)
// ──────────────────────────────────────────
console.log('ℹ️ Changelog is manually curated — skipping auto-generation.');
