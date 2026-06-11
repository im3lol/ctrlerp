import { db } from '@/lib/db'

type ActivityCategory = 'tenant' | 'license' | 'auth' | 'system' | 'user'

interface LogActivityParams {
  action: string
  category: ActivityCategory
  description: string
  performedBy?: string
  performerName?: string
  targetType?: string
  targetId?: string
  targetName?: string
  details?: Record<string, any>
  ipAddress?: string
}

/**
 * Log activity in a non-blocking way (fire-and-forget).
 * Activity logging should never break the main flow or slow down the response.
 */
export function logActivity(params: LogActivityParams) {
  // Fire and forget - don't await, don't block the caller
  db.activityLog.create({
    data: {
      action: params.action,
      category: params.category,
      description: params.description,
      performedBy: params.performedBy,
      performerName: params.performerName,
      targetType: params.targetType,
      targetId: params.targetId,
      targetName: params.targetName,
      details: params.details ? JSON.stringify(params.details) : null,
      ipAddress: params.ipAddress,
    },
  }).catch((error) => {
    console.error('Failed to log activity:', error)
    // Don't throw - activity logging should not break the main flow
  })

  // Create notifications for important events
  if (['license_created', 'license_expired', 'license_suspended', 'tenant_suspended', 'admin_login', 'security_alert'].includes(params.action)) {
    import('./notifications').then(({ createNotification }) => {
      let notifType: 'license_expiring' | 'license_expired' | 'user_limit' | 'system' | 'security' | 'backup' | 'tenant_created' | 'tenant_suspended' | 'payment' = 'system'
      let priority: 'info' | 'warning' | 'critical' = 'info'
      
      if (params.action.startsWith('license_')) {
        notifType = params.action === 'license_expired' ? 'license_expired' : 'license_expiring'
        priority = params.action === 'license_expired' ? 'critical' : 'warning'
      } else if (params.action === 'tenant_suspended') {
        notifType = 'tenant_suspended'
        priority = 'warning'
      } else if (params.action === 'admin_login' || params.action === 'security_alert') {
        notifType = 'security'
        priority = 'info'
      }
      
      createNotification({
        type: notifType,
        title: params.description,
        message: `${params.category}: ${params.description}${params.targetName ? ` - ${params.targetName}` : ''}`,
        priority,
        targetType: params.targetType,
        targetId: params.targetId,
      })
    }).catch((e) => {
      // Don't fail the main operation if notification fails
      console.error('[ActivityLogger] Failed to create notification:', e)
    })
  }
}

export function logLicenseHistory(params: {
  licenseId: string
  action: string
  oldStatus?: string
  newStatus?: string
  oldType?: string
  newType?: string
  oldExpiresAt?: Date
  newExpiresAt?: Date
  oldPrice?: number
  newPrice?: number
  details?: Record<string, any>
  performedBy?: string
}) {
  // Fire and forget
  db.licenseHistory.create({
    data: {
      licenseId: params.licenseId,
      action: params.action,
      oldStatus: params.oldStatus,
      newStatus: params.newStatus,
      oldType: params.oldType,
      newType: params.newType,
      oldExpiresAt: params.oldExpiresAt,
      newExpiresAt: params.newExpiresAt,
      oldPrice: params.oldPrice,
      newPrice: params.newPrice,
      details: params.details ? JSON.stringify(params.details) : null,
      performedBy: params.performedBy,
    },
  }).catch((error) => {
    console.error('Failed to log license history:', error)
  })
}

export function logRevenue(params: {
  tenantId: string
  licenseId: string
  amount: number
  currency: string
  type: string
  periodStart?: Date
  periodEnd?: Date
  description?: string
}) {
  // Fire and forget
  db.revenueRecord.create({
    data: {
      tenantId: params.tenantId,
      licenseId: params.licenseId,
      amount: params.amount,
      currency: params.currency,
      type: params.type,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      description: params.description,
    },
  }).catch((error) => {
    console.error('Failed to log revenue:', error)
  })
}
