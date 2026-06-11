import { db } from '@/lib/db'
import { createNotification } from './notifications'

/**
 * Check for expiring and expired licenses
 * Should be called periodically (e.g., every hour via cron or scheduled task)
 */
export async function checkLicenseExpiry() {
  try {
    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Find expired licenses
    const expiredLicenses = await db.license.findMany({
      where: {
        status: 'active',
        isLifetime: false,
        expiresAt: { lt: now },
      },
      include: { tenant: true },
    })

    for (const license of expiredLicenses) {
      // Update license status
      await db.license.update({
        where: { id: license.id },
        data: { status: 'expired' },
      })

      // Create notification
      await createNotification({
        type: 'license_expired',
        title: `ترخيص منتهي: ${license.tenant.name}`,
        message: `انتهت صلاحية ترخيص ${license.type} للعميل "${license.tenant.name}" في ${license.expiresAt.toLocaleDateString('ar-EG')}`,
        priority: 'critical',
        targetType: 'license',
        targetId: license.id,
        actionUrl: '/admin/licenses',
      })
    }

    // Find licenses expiring in 3 days
    const expiringIn3Days = await db.license.findMany({
      where: {
        status: 'active',
        isLifetime: false,
        expiresAt: { gt: now, lt: threeDaysFromNow },
      },
      include: { tenant: true },
    })

    for (const license of expiringIn3Days) {
      await createNotification({
        type: 'license_expiring',
        title: `ترخيص ينتهي قريباً: ${license.tenant.name}`,
        message: `ترخيص ${license.type} للعميل "${license.tenant.name}" ينتهي خلال 3 أيام`,
        priority: 'critical',
        targetType: 'license',
        targetId: license.id,
        actionUrl: '/admin/licenses',
      })
    }

    // Find licenses expiring in 7 days
    const expiringIn7Days = await db.license.findMany({
      where: {
        status: 'active',
        isLifetime: false,
        expiresAt: { gt: threeDaysFromNow, lt: sevenDaysFromNow },
      },
      include: { tenant: true },
    })

    for (const license of expiringIn7Days) {
      await createNotification({
        type: 'license_expiring',
        title: `ترخيص ينتهي خلال أسبوع: ${license.tenant.name}`,
        message: `ترخيص ${license.type} للعميل "${license.tenant.name}" ينتهي خلال 7 أيام`,
        priority: 'warning',
        targetType: 'license',
        targetId: license.id,
        actionUrl: '/admin/licenses',
      })
    }

    return {
      expired: expiredLicenses.length,
      expiringIn3Days: expiringIn3Days.length,
      expiringIn7Days: expiringIn7Days.length,
    }
  } catch (error) {
    console.error('[LicenseChecker] Error:', error)
    return { expired: 0, expiringIn3Days: 0, expiringIn7Days: 0 }
  }
}
