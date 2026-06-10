import { PrismaClient } from '@prisma/client'
import { verifyLicenseKey, decodeLicenseKey, isLicenseExpired, getLicenseDaysRemaining, verifyMachineFingerprint, generateMachineFingerprint, type LicensePayload } from './license-crypto'
import { getCached, setCache, invalidateCache } from './cache'

// In-memory license cache (5 min TTL)
const LICENSE_CACHE_TTL = 5 * 60 * 1000
// Re-verify signature every 24 hours
const SIGNATURE_REVERIFY_INTERVAL = 24 * 60 * 60 * 1000

export interface LicenseStatus {
  locked: boolean
  active: boolean
  type: string | null
  isTrial: boolean
  isLifetime: boolean
  daysRemaining: number
  maxUsers: number
  maxCompanies: number
  features: string[]
  expiresAt: Date | null
  tenantId: string | null
  licenseKey: string | null
  reason?: string // If locked, why
}

const LOCKED_NO_LICENSE: LicenseStatus = {
  locked: true,
  active: false,
  type: null,
  isTrial: false,
  isLifetime: false,
  daysRemaining: 0,
  maxUsers: 0,
  maxCompanies: 0,
  features: [],
  expiresAt: null,
  tenantId: null,
  licenseKey: null,
  reason: 'NO_LICENSE',
}

/**
 * Check if the system has a valid license (for tenant DB context)
 * This is the primary function called by middleware and API routes
 */
export async function checkLicenseValid(tenantDb: PrismaClient, tenantId: string): Promise<LicenseStatus> {
  // Check cache first
  const cacheKey = `license_status:${tenantId}`
  const cached = getCached<LicenseStatus>(cacheKey)
  if (cached) return cached

  try {
    // Query LicenseStore from tenant DB
    const storedLicense = await tenantDb.licenseStore.findFirst({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
    })

    if (!storedLicense) {
      const status = { ...LOCKED_NO_LICENSE, reason: 'NO_LICENSE' }
      setCache(cacheKey, status, LICENSE_CACHE_TTL)
      return status
    }

    // Check if signature needs re-verification
    const needsReverify = !storedLicense.lastVerifiedAt ||
      (Date.now() - new Date(storedLicense.lastVerifiedAt).getTime()) > SIGNATURE_REVERIFY_INTERVAL

    if (needsReverify) {
      // Re-verify the RSA signature
      const signedKey = decodeLicenseKey(storedLicense.signedKey)
      if (!signedKey) {
        // Corrupted key - lock the system
        await tenantDb.licenseStore.update({
          where: { id: storedLicense.id },
          data: { status: 'suspended' },
        })
        const status: LicenseStatus = { ...LOCKED_NO_LICENSE, reason: 'INVALID_SIGNATURE' }
        setCache(cacheKey, status, LICENSE_CACHE_TTL)
        return status
      }

      const payload = verifyLicenseKey(signedKey)
      if (!payload) {
        // Signature verification failed - FORGED OR TAMPERED
        await tenantDb.licenseStore.update({
          where: { id: storedLicense.id },
          data: { status: 'suspended' },
        })
        const status: LicenseStatus = { ...LOCKED_NO_LICENSE, reason: 'SIGNATURE_MISMATCH' }
        setCache(cacheKey, status, LICENSE_CACHE_TTL)
        return status
      }

      // Verify machine fingerprint if bound
      if (storedLicense.machineFingerprint) {
        const fingerprintValid = await verifyMachineFingerprint(storedLicense.machineFingerprint)
        if (!fingerprintValid) {
          await tenantDb.licenseStore.update({
            where: { id: storedLicense.id },
            data: { status: 'suspended' },
          })
          const status: LicenseStatus = { ...LOCKED_NO_LICENSE, reason: 'MACHINE_MISMATCH' }
          setCache(cacheKey, status, LICENSE_CACHE_TTL)
          return status
        }
      }

      // Update verification timestamp
      await tenantDb.licenseStore.update({
        where: { id: storedLicense.id },
        data: {
          lastVerifiedAt: new Date(),
          verificationCount: { increment: 1 },
        },
      })
    }

    // Check expiration
    if (!storedLicense.isLifetime && new Date(storedLicense.expiresAt) < new Date()) {
      await tenantDb.licenseStore.update({
        where: { id: storedLicense.id },
        data: { status: 'expired' },
      })
      const status: LicenseStatus = { ...LOCKED_NO_LICENSE, reason: 'LICENSE_EXPIRED' }
      setCache(cacheKey, status, LICENSE_CACHE_TTL)
      return status
    }

    // License is valid!
    const features: string[] = storedLicense.features ? JSON.parse(storedLicense.features) : []
    const status: LicenseStatus = {
      locked: false,
      active: true,
      type: storedLicense.type,
      isTrial: storedLicense.type === 'trial',
      isLifetime: storedLicense.isLifetime,
      daysRemaining: storedLicense.isLifetime ? Infinity : getLicenseDaysRemaining({
        isLifetime: storedLicense.isLifetime,
        expiresAt: storedLicense.expiresAt.toISOString(),
      } as LicensePayload),
      maxUsers: storedLicense.maxUsers,
      maxCompanies: storedLicense.maxCompanies,
      features,
      expiresAt: storedLicense.expiresAt,
      tenantId: storedLicense.tenantId,
      licenseKey: storedLicense.licenseKey,
    }
    setCache(cacheKey, status, LICENSE_CACHE_TTL)
    return status
  } catch (error) {
    console.error('[License] Check failed:', error)
    // On error, lock the system (fail-closed)
    const status: LicenseStatus = { ...LOCKED_NO_LICENSE, reason: 'VERIFICATION_ERROR' }
    return status
  }
}

/**
 * Activate a license key on this system
 * Called from the license activation page
 */
export async function activateLicense(
  tenantDb: PrismaClient,
  encodedKey: string
): Promise<{ success: boolean; status?: LicenseStatus; error?: string }> {
  try {
    // Decode the key
    const signedKey = decodeLicenseKey(encodedKey)
    if (!signedKey) {
      return { success: false, error: 'مفتاح الترخيص غير صالح - لا يمكن فك تشفيره' }
    }

    // Verify the RSA signature
    const payload = verifyLicenseKey(signedKey)
    if (!payload) {
      return { success: false, error: 'مفتاح الترخيص غير صالح - فشل التحقق من التوقيع' }
    }

    // Check if already expired
    if (isLicenseExpired(payload)) {
      return { success: false, error: 'مفتاح الترخيص منتهي الصلاحية' }
    }

    // Check machine fingerprint binding
    if (payload.machineFingerprint) {
      const fingerprintValid = await verifyMachineFingerprint(payload.machineFingerprint)
      if (!fingerprintValid) {
        return { success: false, error: 'مفتاح الترخيص مرتبط بجهاز آخر' }
      }
    }

    // Deactivate any existing licenses
    await tenantDb.licenseStore.updateMany({
      where: { status: 'active' },
      data: { status: 'cancelled' },
    })

    // Generate machine fingerprint for this deployment
    const machineFingerprint = payload.machineFingerprint || await generateMachineFingerprint()

    // Store the new license
    const licenseStore = await tenantDb.licenseStore.create({
      data: {
        licenseId: payload.licenseId,
        licenseKey: `CTRL-${payload.licenseId.substring(0, 4).toUpperCase()}-${payload.type.substring(0, 4).toUpperCase()}`,
        signedKey: encodedKey,
        tenantId: payload.tenantId,
        type: payload.type,
        status: 'active',
        maxUsers: payload.maxUsers,
        maxCompanies: payload.maxCompanies,
        isLifetime: payload.isLifetime,
        price: payload.price,
        monthlyPrice: payload.monthlyPrice,
        currency: payload.currency,
        features: JSON.stringify(payload.features),
        machineFingerprint,
        issuedAt: new Date(payload.issuedAt),
        expiresAt: new Date(payload.expiresAt),
        activatedAt: new Date(),
        lastVerifiedAt: new Date(),
        verificationCount: 1,
      },
    })

    // Invalidate license cache
    invalidateCache(`license_status:`)

    // Return the new status
    const features: string[] = payload.features || []
    const status: LicenseStatus = {
      locked: false,
      active: true,
      type: payload.type,
      isTrial: payload.type === 'trial',
      isLifetime: payload.isLifetime,
      daysRemaining: payload.isLifetime ? Infinity : getLicenseDaysRemaining(payload),
      maxUsers: payload.maxUsers,
      maxCompanies: payload.maxCompanies,
      features,
      expiresAt: new Date(payload.expiresAt),
      tenantId: payload.tenantId,
      licenseKey: licenseStore.licenseKey,
    }

    return { success: true, status }
  } catch (error: any) {
    console.error('[License] Activation failed:', error)
    return { success: false, error: 'فشل تفعيل الترخيص: ' + (error.message || 'خطأ غير متوقع') }
  }
}

/**
 * Quick check for middleware - uses cache heavily
 * Returns true if system is locked (no valid license)
 */
export function isSystemLocked(tenantId: string): boolean {
  const cacheKey = `license_status:${tenantId}`
  const cached = getCached<LicenseStatus>(cacheKey)
  if (cached) return cached.locked
  // If not cached, we need to check - default to unlocked for now
  // The actual check happens in the API route
  return false
}

/**
 * Get license status for UI display
 */
export async function getLicenseStatus(tenantDb: PrismaClient, tenantId: string): Promise<LicenseStatus> {
  return checkLicenseValid(tenantDb, tenantId)
}
