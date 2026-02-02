import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Types
interface User {
    id: string;
    serial: string;
    name: string;
    username: string;
    tempPassword: string; // Plain text for distribution
    tempPasswordHash?: string;
    group: string;
    section: string;
    mustChangePassword: boolean;
}

// Using process.cwd() to be ESM safe and run from project root
const RAW_FILE = path.join(process.cwd(), 'src', 'data', 'students_raw.txt');
const SECURE_DIR = path.join(process.cwd(), 'secure_data');
const SEED_FILE = path.join(process.cwd(), 'secure_data', 'seed.json');

// Map Arabic numerals to English if needed
function toEnglishDigits(str: string): string {
    return str.replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
}

function generateRandomPassword(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateUsername(name: string, serial: string, group: string): string {
    // "A1-123" (Group A, Section 1, Serial 123)
    return `${group}-${serial}`.toUpperCase();
}

async function main() {
    console.log(`📂 Reading data from: ${RAW_FILE}`);

    if (!fs.existsSync(RAW_FILE)) {
        console.error('❌ Data file not found:', RAW_FILE);
        console.log('   Make sure you are running this script from the project root.');
        return;
    }

    const rawText = fs.readFileSync(RAW_FILE, 'utf-8');
    const lines = rawText.split('\n');
    const users: User[] = [];

    // State tracking
    let currentGroup = 'A'; // Default to A to ensure we capture initial rows
    let currentSection = '1';

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Detect Group (A-D)
        const groupMatch = trimmed.match(/[A-D]/i);
        if (groupMatch && (trimmed.includes('Group') || trimmed.includes('المجموعة') || trimmed.length < 10)) {
            currentGroup = groupMatch[0].toUpperCase();
        }

        // Detect Section
        const secMatch = trimmed.match(/(?:Section|السكشن)\s*(\d+)/i);
        if (secMatch) {
            currentSection = secMatch[1];
        }

        // Detect Student Row
        // Lenient: Any line with a number that isn't a date (2025)
        // and has some text (Name)
        const digitMatch = trimmed.match(/(\d+)/);
        if (!digitMatch) continue;

        const serial = digitMatch[0];
        if (serial.length > 4) continue;
        if (trimmed.includes('2025')) continue;

        // Extract Name: Remove digits and special chars
        const namePart = trimmed.replace(/\d+/g, '').replace(/[^\u0600-\u06FFa-zA-Z\s]/g, '').trim();
        if (namePart.length < 3) continue;

        const userId = crypto.randomUUID();
        // Username: {Group}{Section}-{Serial}-{Random}
        // User asked for: "Section A1... make username and passwords randomly"
        // Let's do: A1-{Serial}-{RandomSuffix}
        const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const username = `${currentGroup}${currentSection}-${serial}-${suffix}`;
        const password = Math.floor(100000 + Math.random() * 900000).toString();

        const user: User = {
            id: userId,
            serial,
            name: namePart,
            username,
            tempPassword: password,
            group: currentGroup,
            section: currentSection,
            mustChangePassword: true
        };

        users.push(user);
    }

    console.log(`✅ Parsed ${users.length} students.`);

    // Output
    if (!fs.existsSync(SECURE_DIR)) fs.mkdirSync(SECURE_DIR);

    // Create folders for Group/Section e.g. "A1", "C3"
    for (const user of users) {
        const folderName = `${user.group}${user.section}`;
        const dir = path.join(SECURE_DIR, folderName);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(
            path.join(dir, `${user.username}.json`),
            JSON.stringify(user, null, 2)
        );
    }

    // Consolidated Seed
    fs.writeFileSync(SEED_FILE, JSON.stringify(users, null, 2));
    console.log(`✅ Seed file created at: ${SEED_FILE}`);
}

main();
