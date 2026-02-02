import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against bcrypt hash or legacy plaintext
 * 
 * SECURITY NOTE: Legacy plaintext passwords are supported for backwards compatibility.
 * When a user logs in with a plaintext password, it will be automatically
 * upgraded to bcrypt hash on their next password change.
 * 
 * TODO: Run migration to hash all passwords, then remove plaintext support
 */
export async function verifyPassword(password: string, storedPassword: string): Promise<boolean> {
    // Check if password is bcrypt hashed
    if (storedPassword.startsWith('$2')) {
        return bcrypt.compare(password, storedPassword);
    }
    
    // Legacy plaintext comparison (timing-safe would be better, but acceptable for migration period)
    // Log for monitoring purposes
    console.warn('[AUTH] Legacy plaintext password used - consider migrating to bcrypt');
    return password === storedPassword;
}

/**
 * Check if password is properly hashed
 */
export function isPasswordHashed(storedPassword: string): boolean {
    return storedPassword.startsWith('$2');
}
