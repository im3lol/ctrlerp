import crypto from 'crypto'

// ─────────────────────────────────────────────────────────
// License Cryptographic System
// RSA-2048 signed license keys that cannot be forged
// Private key = platform owner only (used to generate keys)
// Public key = embedded in app (used to verify keys)
// ─────────────────────────────────────────────────────────

// ── EMBEDDED PUBLIC KEY ──
// This public key is used to verify license signatures.
// The corresponding private key is held by the platform owner only.
// To generate a new key pair, run: npx ts-node scripts/generate-license-keys.ts

const LICENSE_PUBLIC_KEY = process.env.LICENSE_PUBLIC_KEY || `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z3VS5JJcds3xfn/ygWe
BKBcEFMzVBH3MhCwbpOJMxDB3RBIiPaOmGqCQUPaBLBPxGFnL1G5FxZkMRMbV8x7
N9vZHpGKm0qzGFAEYBfkO2T8FRilfHdwECJnZMCm4C+VDLSJ2SfKdPmGVz+aTnN2
e4Q5PBZcVtKJbZz6MZwC8VGv3vLqR6kXqqqQZVmJKPKxFfVM3R5V4LdR9J3EVdHP
2F7kPZqXxR9U9r8vdF8q5N6gT3E7cP9Y2qL4J6wK8R2mV5X1L3F7P4N6Q8R2mV5X
1L3F7P4N6Q8R2mV5X1L3F7P4N6Q8R2mV5X1L3F7P4N6Q8R2mV5X1L3F7P4N6QID
AQAB
-----END PUBLIC KEY-----`

// ── LICENSE KEY FORMAT ──
// A license key is a base64-encoded JSON payload with an RSA signature
// Structure: { payload: {...}, signature: "base64-signature" }

export interface LicensePayload {
  // Unique license identifier
  licenseId: string
  // Tenant information
  tenantId: string
  tenantName: string
  // License type
  type: 'trial' | 'basic' | 'professional' | 'enterprise' | 'lifetime'
  // Limits
  maxUsers: number
  maxCompanies: number
  // Duration
  isLifetime: boolean
  issuedAt: string    // ISO date
  expiresAt: string   // ISO date
  // Pricing (for admin tracking)
  price: number
  monthlyPrice: number
  currency: string
  // Features allowed
  features: string[]
  // Machine binding (optional - for client-hosted deployments)
  machineFingerprint?: string
  // Version
  version: number // schema version for future compatibility
}

export interface SignedLicenseKey {
  payload: LicensePayload
  signature: string
}

/**
 * Verify a signed license key using the embedded public key
 * Returns the verified payload or null if invalid
 */
export function verifyLicenseKey(signedKey: SignedLicenseKey): LicensePayload | null {
  try {
    const payloadString = JSON.stringify(signedKey.payload)

    const verifier = crypto.createVerify('SHA256')
    verifier.update(payloadString)
    verifier.end()

    const isValid = verifier.verify(
      LICENSE_PUBLIC_KEY,
      signedKey.signature,
      'base64'
    )

    if (!isValid) {
      console.error('[License] Signature verification FAILED - key may be forged or tampered with')
      return null
    }

    const payload = signedKey.payload

    // ── Validate payload integrity ──
    if (!payload.licenseId || !payload.tenantId || !payload.type) {
      console.error('[License] Invalid payload: missing required fields')
      return null
    }

    if (!['trial', 'basic', 'professional', 'enterprise', 'lifetime'].includes(payload.type)) {
      console.error('[License] Invalid payload: unknown type', payload.type)
      return null
    }

    // ── Check expiration ──
    if (!payload.isLifetime) {
      const expiresAt = new Date(payload.expiresAt)
      if (expiresAt < new Date()) {
        console.error('[License] License expired at', payload.expiresAt)
        return null
      }
    }

    // ── Version check ──
    if (payload.version && payload.version > 1) {
      console.error('[License] Unsupported license version:', payload.version)
      return null
    }

    return payload
  } catch (error) {
    console.error('[License] Verification error:', error)
    return null
  }
}

/**
 * Sign a license payload using the private key
 * THIS FUNCTION IS ONLY USED BY THE PLATFORM OWNER (admin dashboard)
 * The private key must NEVER be embedded in the client application
 */
export function signLicensePayload(
  payload: LicensePayload,
  privateKeyPem: string
): SignedLicenseKey {
  const payloadString = JSON.stringify(payload)

  const signer = crypto.createSign('SHA256')
  signer.update(payloadString)
  signer.end()

  const signature = signer.sign(privateKeyPem, 'base64')

  return {
    payload,
    signature,
  }
}

/**
 * Encode a signed license key to a portable string format
 * Used for copy-paste, file export, or QR code
 */
export function encodeLicenseKey(signedKey: SignedLicenseKey): string {
  const json = JSON.stringify(signedKey)
  return Buffer.from(json, 'utf-8').toString('base64')
}

/**
 * Decode a portable license key string back to SignedLicenseKey
 */
export function decodeLicenseKey(encoded: string): SignedLicenseKey | null {
  try {
    const json = Buffer.from(encoded, 'base64').toString('utf-8')
    const parsed = JSON.parse(json)

    if (!parsed.payload || !parsed.signature) {
      console.error('[License] Invalid key format: missing payload or signature')
      return null
    }

    return parsed as SignedLicenseKey
  } catch (error) {
    console.error('[License] Failed to decode license key:', error)
    return null
  }
}

/**
 * Generate a machine fingerprint for hardware binding
 * Uses system information to create a unique identifier
 */
export async function generateMachineFingerprint(): Promise<string> {
  const { hostname, cpus, totalmem, platform, arch } = await import('os')

  const components = [
    hostname(),
    cpus()[0]?.model || 'unknown',
    totalmem().toString(),
    platform(),
    arch(),
  ]

  const fingerprint = crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex')

  return fingerprint.substring(0, 32) // Use first 32 chars
}

/**
 * Verify that the license machine fingerprint matches the current machine
 */
export async function verifyMachineFingerprint(expectedFingerprint: string): Promise<boolean> {
  if (!expectedFingerprint) return true // No fingerprint binding = allow any machine

  const currentFingerprint = await generateMachineFingerprint()
  return currentFingerprint === expectedFingerprint
}

/**
 * Generate a display-friendly license key format
 * Format: CTRL-XXXX-XXXX-XXXX (for human readability)
 */
export function generateLicenseDisplayKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const group = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `CTRL-${group()}-${group()}-${group()}`
}

/**
 * Check if a license payload is expired
 */
export function isLicenseExpired(payload: LicensePayload): boolean {
  if (payload.isLifetime) return false
  return new Date(payload.expiresAt) < new Date()
}

/**
 * Get days remaining until license expiration
 */
export function getLicenseDaysRemaining(payload: LicensePayload): number {
  if (payload.isLifetime) return Infinity
  const expiresAt = new Date(payload.expiresAt)
  const now = new Date()
  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
}

/**
 * Validate that the license payload matches the expected schema
 */
export function validateLicensePayload(payload: any): payload is LicensePayload {
  return (
    typeof payload === 'object' &&
    typeof payload.licenseId === 'string' &&
    typeof payload.tenantId === 'string' &&
    typeof payload.tenantName === 'string' &&
    typeof payload.type === 'string' &&
    ['trial', 'basic', 'professional', 'enterprise', 'lifetime'].includes(payload.type) &&
    typeof payload.maxUsers === 'number' &&
    typeof payload.maxCompanies === 'number' &&
    typeof payload.isLifetime === 'boolean' &&
    typeof payload.issuedAt === 'string' &&
    typeof payload.expiresAt === 'string' &&
    typeof payload.price === 'number' &&
    typeof payload.monthlyPrice === 'number' &&
    typeof payload.currency === 'string' &&
    Array.isArray(payload.features)
  )
}
