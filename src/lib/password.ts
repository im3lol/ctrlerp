import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a password against a hash
 * Supports both bcrypt hashes and legacy base64-encoded passwords for migration
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  // Check if this is a bcrypt hash (starts with $2a$, $2b$, or $2y$)
  if (hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2b$') || hashedPassword.startsWith('$2y$')) {
    return bcrypt.compare(password, hashedPassword)
  }
  
  // Legacy: Base64-encoded password (for migration compatibility)
  const base64Password = Buffer.from(password).toString('base64')
  if (hashedPassword === base64Password) {
    return true
  }
  
  return false
}

/**
 * Check if a password hash is using legacy base64 encoding
 */
export function isLegacyPassword(hashedPassword: string): boolean {
  return !hashedPassword.startsWith('$2a$') && !hashedPassword.startsWith('$2b$') && !hashedPassword.startsWith('$2y$')
}
