import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SW_PATH = path.join(process.cwd(), 'public', 'sw.js');
const CHANGELOG_PATH = path.join(process.cwd(), 'src', 'lib', 'data', 'changelog-generated.json');

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
// 2. Auto-generate changelog from git history
// ──────────────────────────────────────────
try {
    // Read existing changelog if present
    let existingEntries = [];
    try {
        const existing = fs.readFileSync(CHANGELOG_PATH, 'utf8');
        existingEntries = JSON.parse(existing);
    } catch { /* first run */ }

    // Date-based version: YYYY.MM.DD
    const now = new Date();
    const dateVersion = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
    const dateStr = now.toISOString().split('T')[0];
    const deployTime = now.toISOString();

    // Get git commits since last tag or last 50 commits
    let gitLog = '';
    try {
        // Try to get commits since last tag
        const lastTag = execSync('git describe --tags --abbrev=0 2>/dev/null', { encoding: 'utf8' }).trim();
        gitLog = execSync(`git log ${lastTag}..HEAD --pretty=format:"%s" --no-merges 2>/dev/null`, { encoding: 'utf8' }).trim();
    } catch {
        // No tags — get last 30 commits
        gitLog = execSync('git log -30 --pretty=format:"%s" --no-merges 2>/dev/null', { encoding: 'utf8' }).trim();
    }

    if (!gitLog) {
        console.log('ℹ️ No new commits found, keeping existing changelog');
        // Still write file if it doesn't exist
        if (existingEntries.length === 0) {
            fs.writeFileSync(CHANGELOG_PATH, JSON.stringify([{
                version: dateVersion,
                date: dateStr,
                deployedAt: deployTime,
                title: 'Initial Release',
                changes: ['🚀 Science Hub is live!']
            }], null, 2));
        }
    } else {
        const commits = gitLog.split('\n').filter(Boolean).map(c => c.replace(/^"|"$/g, ''));

        // Categorize commits by conventional-commit-style prefixes
        const categories = {
            features: [],    // feat:
            fixes: [],       // fix:
            performance: [], // perf:
            security: [],    // security: / sec:
            ui: [],          // ui: / style: / design:
            other: []        // everything else
        };

        for (const msg of commits) {
            const lower = msg.toLowerCase();
            if (lower.startsWith('feat:') || lower.startsWith('feature:') || lower.startsWith('add:')) {
                categories.features.push('✨ ' + msg.replace(/^(feat|feature|add):\s*/i, ''));
            } else if (lower.startsWith('fix:') || lower.startsWith('bugfix:')) {
                categories.fixes.push('🐛 ' + msg.replace(/^(fix|bugfix):\s*/i, ''));
            } else if (lower.startsWith('perf:') || lower.startsWith('performance:')) {
                categories.performance.push('⚡ ' + msg.replace(/^(perf|performance):\s*/i, ''));
            } else if (lower.startsWith('security:') || lower.startsWith('sec:')) {
                categories.security.push('🔒 ' + msg.replace(/^(security|sec):\s*/i, ''));
            } else if (lower.startsWith('ui:') || lower.startsWith('style:') || lower.startsWith('design:')) {
                categories.ui.push('🎨 ' + msg.replace(/^(ui|style|design):\s*/i, ''));
            } else {
                // Skip merge commits and very short messages
                if (!lower.startsWith('merge') && msg.length > 5) {
                    categories.other.push('📦 ' + msg);
                }
            }
        }

        // Build changes array with section headers
        const changes = [];
        if (categories.features.length) changes.push(...categories.features.slice(0, 5));
        if (categories.fixes.length) changes.push(...categories.fixes.slice(0, 3));
        if (categories.performance.length) changes.push(...categories.performance.slice(0, 3));
        if (categories.security.length) changes.push(...categories.security.slice(0, 3));
        if (categories.ui.length) changes.push(...categories.ui.slice(0, 3));
        if (categories.other.length && changes.length < 8) changes.push(...categories.other.slice(0, 3));

        // Fallback if no categorized changes
        if (changes.length === 0) {
            changes.push('🚀 System updates and improvements');
        }

        // Auto-generate a title from the dominant category
        let title = 'System Update';
        const maxCat = Object.entries(categories).sort((a, b) => b[1].length - a[1].length)[0];
        if (maxCat[1].length > 0) {
            const titleMap = {
                features: 'New Features',
                fixes: 'Bug Fixes',
                performance: 'Performance Update',
                security: 'Security Update',
                ui: 'Design Update',
                other: 'System Update'
            };
            title = titleMap[maxCat[0]] || 'System Update';
        }

        // Check if we already have an entry for today — update it instead of duplicating
        const todayIdx = existingEntries.findIndex(e => e.date === dateStr);
        const newEntry = {
            version: todayIdx >= 0 ? dateVersion + '.' + String(Date.now()).slice(-4) : dateVersion,
            date: dateStr,
            deployedAt: deployTime,
            title,
            changes
        };

        if (todayIdx >= 0) {
            existingEntries[todayIdx] = newEntry;
        } else {
            existingEntries.unshift(newEntry);
        }

        // Keep only last 20 entries
        existingEntries = existingEntries.slice(0, 20);

        fs.writeFileSync(CHANGELOG_PATH, JSON.stringify(existingEntries, null, 2));
        console.log(`✅ Changelog generated: ${dateVersion} — ${title} (${changes.length} changes)`);
    }

    // Tag this deploy in git (non-fatal if it fails)
    try {
        execSync(`git tag -f deploy-${dateVersion} 2>/dev/null`);
    } catch { /* CI may not have push permissions — that's fine */ }

} catch (error) {
    console.warn('⚠️ Changelog generation skipped (git not available):', error.message);
    // Ensure file exists even if git fails
    if (!fs.existsSync(CHANGELOG_PATH)) {
        fs.writeFileSync(CHANGELOG_PATH, JSON.stringify([{
            version: '1.0.0',
            date: new Date().toISOString().split('T')[0],
            deployedAt: new Date().toISOString(),
            title: 'Science Hub',
            changes: ['🚀 Science Hub is live!']
        }], null, 2));
    }
}
