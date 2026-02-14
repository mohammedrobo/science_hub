import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against bcrypt hash.
 * Plaintext password support has been removed for security.
 * Run the migrate-passwords script to hash any remaining plaintext passwords.
 */
export async function verifyPassword(password: string, storedPassword: string): Promise<boolean> {
    if (!storedPassword.startsWith('$2')) {
        // Password is not hashed — reject and log
        console.error('[AUTH] Unhashed password detected for login attempt. Run migrate-passwords script.');
        return false;
    }
    return bcrypt.compare(password, storedPassword);
}

/**
 * Check if password is properly hashed
 */
export function isPasswordHashed(storedPassword: string): boolean {
    return storedPassword.startsWith('$2');
}
