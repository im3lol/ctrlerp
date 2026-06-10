import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-guard'
import { logActivity, logLicenseHistory, logRevenue } from '@/lib/activity-logger'

// GET: License details with tenant info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth(request)
    const { id } = await params

    const license = await db.license.findUnique({
      where: { id },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
          },
        },
        history: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!license) {
      return NextResponse.json({ error: 'الترخيص غير موجود' }, { status: 404 })
    }

    return NextResponse.json({ license })
  } catch (error) {
    console.error('Get license error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: message.includes('غير مصرح') ? 401 : 500 })
  }
}

// PATCH: Update license (extend expiry, change status, change type, activate with months/lifetime)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminAuth(request)
    const { id } = await params

    const body = await request.json()
    const { status, type, extendDays, extendMonths, maxUsers, maxCompanies, isLifetime, price, currency, monthlyPrice, activateLifetime, activateMonths } = body

    const existing = await db.license.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'الترخيص غير موجود' }, { status: 404 })
    }

    const data: any = {}
    let historyAction = 'updated'
    let activityAction = 'license_updated'
    let activityDescription = ''

    if (status && ['active', 'expired', 'suspended', 'cancelled'].includes(status)) {
      data.status = status
    }
    if (type && ['trial', 'basic', 'professional', 'enterprise', 'lifetime'].includes(type)) {
      data.type = type
    }
    if (maxUsers !== undefined) {
      data.maxUsers = maxUsers
    }
    if (maxCompanies !== undefined) {
      data.maxCompanies = maxCompanies
    }
    if (price !== undefined) {
      data.price = price
    }
    if (monthlyPrice !== undefined) {
      data.monthlyPrice = monthlyPrice
    }
    if (currency !== undefined) {
      data.currency = currency
    }
    if (isLifetime !== undefined) {
      data.isLifetime = isLifetime
    }

    // Activate for specific months
    if (activateMonths && activateMonths > 0) {
      data.status = 'active'
      data.isLifetime = false
      data.type = data.type || (existing.type === 'trial' ? 'basic' : existing.type)
      const baseDate = existing.expiresAt > new Date() ? existing.expiresAt : new Date()
      data.expiresAt = new Date(baseDate)
      data.expiresAt.setMonth(data.expiresAt.getMonth() + activateMonths)
      historyAction = 'activated'
      activityAction = 'license_activated_months'
      activityDescription = `تفعيل ترخيص ${activateMonths} شهر للمستأجر ${existing.tenant.name}`

      // Log revenue
      if (price && price > 0) {
        const periodEnd = new Date(baseDate)
        periodEnd.setMonth(periodEnd.getMonth() + activateMonths)
        await logRevenue({
          tenantId: existing.tenantId,
          licenseId: existing.id,
          amount: price,
          currency: currency || existing.currency,
          type: 'subscription',
          periodStart: baseDate instanceof Date && baseDate > new Date() ? baseDate : new Date(),
          periodEnd,
          description: `تفعيل ${activateMonths} شهر - ${existing.tenant.name}`,
        })
      }
    }

    // Activate lifetime
    if (activateLifetime) {
      data.status = 'active'
      data.isLifetime = true
      data.type = data.type || 'lifetime'
      data.expiresAt = new Date('2099-12-31T23:59:59.999Z')
      historyAction = 'lifetime_activated'
      activityAction = 'license_activated_lifetime'
      activityDescription = `تفعيل ترخيص مدى الحياة للمستأجر ${existing.tenant.name}`

      // Log revenue
      if (price && price > 0) {
        await logRevenue({
          tenantId: existing.tenantId,
          licenseId: existing.id,
          amount: price,
          currency: currency || existing.currency,
          type: 'lifetime',
          periodStart: new Date(),
          description: `تفعيل مدى الحياة - ${existing.tenant.name}`,
        })
      }
    }

    // Extend by days (for trial extension)
    if (extendDays && extendDays > 0) {
      const currentExpiry = existing.expiresAt
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date()
      data.expiresAt = new Date(baseDate.getTime() + extendDays * 24 * 60 * 60 * 1000)
      if (data.status !== 'active') {
        data.status = 'active'
      }
      historyAction = 'trial_extended'
      activityAction = 'license_trial_extended'
      activityDescription = `مد فترة التجربة ${extendDays} يوم للمستأجر ${existing.tenant.name}`
    }

    // Extend by months
    if (extendMonths && extendMonths > 0) {
      const currentExpiry = existing.expiresAt
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date()
      data.expiresAt = new Date(baseDate)
      data.expiresAt.setMonth(data.expiresAt.getMonth() + extendMonths)
      if (data.status !== 'active') {
        data.status = 'active'
      }
      historyAction = 'months_extended'
      activityAction = 'license_months_extended'
      activityDescription = `تمديد الاشتراك ${extendMonths} شهر للمستأجر ${existing.tenant.name}`

      // Log revenue for renewal
      if (existing.price > 0) {
        const periodEnd = new Date(baseDate)
        periodEnd.setMonth(periodEnd.getMonth() + extendMonths)
        await logRevenue({
          tenantId: existing.tenantId,
          licenseId: existing.id,
          amount: existing.monthlyPrice * extendMonths || existing.price,
          currency: existing.currency,
          type: 'renewal',
          periodStart: baseDate instanceof Date && baseDate > new Date() ? baseDate : new Date(),
          periodEnd,
          description: `تمديد ${extendMonths} شهر - ${existing.tenant.name}`,
        })
      }
    }

    // Handle status changes
    if (status === 'suspended' && existing.status !== 'suspended') {
      historyAction = 'suspended'
      activityAction = 'license_suspended'
      activityDescription = `تعليق ترخيص المستأجر ${existing.tenant.name}`
    } else if (status === 'active' && existing.status === 'suspended') {
      historyAction = 'reactivated'
      activityAction = 'license_reactivated'
      activityDescription = `إعادة تفعيل ترخيص المستأجر ${existing.tenant.name}`
    } else if (status === 'cancelled') {
      historyAction = 'cancelled'
      activityAction = 'license_cancelled'
      activityDescription = `إلغاء ترخيص المستأجر ${existing.tenant.name}`
    }

    if (!activityDescription) {
      activityDescription = `تحديث ترخيص المستأجر ${existing.tenant.name}`
    }

    const license = await db.license.update({
      where: { id },
      data,
      include: {
        tenant: {
          select: { id: true, name: true, status: true },
        },
      },
    })

    // Log license history
    await logLicenseHistory({
      licenseId: id,
      action: historyAction,
      oldStatus: existing.status,
      newStatus: data.status || existing.status,
      oldType: existing.type,
      newType: data.type || existing.type,
      oldExpiresAt: existing.expiresAt,
      newExpiresAt: data.expiresAt || existing.expiresAt,
      oldPrice: existing.price,
      newPrice: data.price !== undefined ? data.price : existing.price,
      performedBy: admin.id,
      details: { extendDays, extendMonths, activateMonths, activateLifetime },
    })

    // Log activity
    await logActivity({
      action: activityAction,
      category: 'license',
      description: activityDescription,
      performedBy: admin.id,
      performerName: admin.name,
      targetType: 'license',
      targetId: id,
      targetName: existing.tenant.name,
      details: { oldStatus: existing.status, newStatus: data.status, extendDays, extendMonths, activateMonths, activateLifetime },
    })

    return NextResponse.json({ license })
  } catch (error) {
    console.error('Update license error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: message.includes('غير مصرح') ? 401 : 500 })
  }
}
