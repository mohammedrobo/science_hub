import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against bcrypt hash
 * 
 * SECURITY: Plaintext password support has been REMOVED.
 * All passwords MUST be bcrypt hashed.
 * 
 * If you have legacy plaintext passwords, run the migration script:
 * npx tsx scripts/migrate-passwords.ts
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    // SECURITY: Reject non-bcrypt hashes (legacy plaintext)
    if (!hash.startsWith('$2')) {
        console.error('[SECURITY] Attempted login with non-bcrypt password. Run migration script.');
        return false;
    }
    return bcrypt.compare(password, hash);
}

/**
 * Check if password is properly hashed
 */
export function isPasswordHashed(storedPassword: string): boolean {
    return storedPassword.startsWith('$2');
}
