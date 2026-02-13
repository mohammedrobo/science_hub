import fs from 'fs';
import path from 'path';

const SW_PATH = path.join(process.cwd(), 'public', 'sw.js');

try {
    let content = fs.readFileSync(SW_PATH, 'utf8');

    // Generate a version based on timestamp (e.g., v1739...)
    const newVersion = `v${Date.now()}`;

    // Regex to find: const CACHE_NAME = 'science-hub-v...';
    // We replace it with: const CACHE_NAME = 'science-hub-[timestamp]';
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
