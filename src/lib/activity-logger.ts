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

export async function logActivity(params: LogActivityParams) {
  try {
    await db.activityLog.create({
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
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
    // Don't throw - activity logging should not break the main flow
  }
}

export async function logLicenseHistory(params: {
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
  try {
    await db.licenseHistory.create({
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
    })
  } catch (error) {
    console.error('Failed to log license history:', error)
  }
}

export async function logRevenue(params: {
  tenantId: string
  licenseId: string
  amount: number
  currency: string
  type: string
  periodStart?: Date
  periodEnd?: Date
  description?: string
}) {
  try {
    await db.revenueRecord.create({
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
    })
  } catch (error) {
    console.error('Failed to log revenue:', error)
  }
}
