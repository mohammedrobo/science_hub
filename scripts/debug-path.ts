
import fs from 'fs';
import path from 'path';

console.log(`CWD: ${process.cwd()}`);

const paths = [
    path.join(process.cwd(), 'secure_data', 'access_keys.json'),
    path.join(process.cwd(), '..', 'secure_data', 'access_keys.json'),
    '/home/satoru/projects/science_hub/secure_data/access_keys.json' // Absolute path for testing
];

paths.forEach(p => {
    console.log(`Checking: ${p}`);
    if (fs.existsSync(p)) {
        console.log(`✅ FOUND! Size: ${fs.statSync(p).size} bytes`);
    } else {
        console.log(`❌ NOT FOUND`);
    }
});
