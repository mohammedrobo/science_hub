import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    // Backwards compatibility: if hash doesn't start with $2, it's plaintext
    if (!hash.startsWith('$2')) {
        // Legacy plaintext comparison (will be migrated)
        return password === hash;
    }
    return bcrypt.compare(password, hash);
}

/**
 * Check if password needs migration (is plaintext)
 */
export function needsHashMigration(storedPassword: string): boolean {
    return !storedPassword.startsWith('$2');
}
