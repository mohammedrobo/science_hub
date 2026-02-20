import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against stored password.
 * Supports bcrypt hashes (preferred) and plaintext legacy passwords.
 * Returns { valid, needsHash } — if needsHash is true, the caller
 * should re-hash and update the DB so the migration happens transparently.
 */
export async function verifyPassword(
    password: string,
    storedPassword: string
): Promise<{ valid: boolean; needsHash: boolean }> {
    if (storedPassword.startsWith('$2')) {
        // Stored password is a bcrypt hash — compare properly
        const valid = await bcrypt.compare(password, storedPassword);
        return { valid, needsHash: false };
    }

    // Legacy plaintext password — direct comparison
    // Flag needsHash so the caller auto-migrates to bcrypt
    const valid = password === storedPassword;
    if (valid) {
        console.warn('[AUTH] Plaintext password matched — will auto-migrate to bcrypt.');
    }
    return { valid, needsHash: valid };
}

/**
 * Check if password is properly hashed
 */
export function isPasswordHashed(storedPassword: string): boolean {
    return storedPassword.startsWith('$2');
}
