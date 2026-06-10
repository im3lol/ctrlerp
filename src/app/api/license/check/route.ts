import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantDb } from '@/lib/tenant-db'
import { checkLicenseValid } from '@/lib/license-enforcement'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const tenantId = searchParams.get('tenantId')

    // If tenantId provided, check from LicenseStore (strict enforcement)
    if (tenantId) {
      try {
        const tenantDb = await getTenantDb(tenantId)
        const status = await checkLicenseValid(tenantDb, tenantId)
        return NextResponse.json({
          active: status.active,
          type: status.type,
          expiresAt: status.expiresAt,
          daysLeft: status.daysRemaining === Infinity ? null : status.daysRemaining,
          isTrial: status.isTrial,
          isLifetime: status.isLifetime,
          tenantStatus: status.locked ? 'suspended' : 'active',
          licenseKey: status.licenseKey,
          maxUsers: status.maxUsers,
          maxCompanies: status.maxCompanies,
          locked: status.locked,
          reason: status.reason,
        })
      } catch (e) {
        console.error('LicenseStore check failed:', e)
      }
    }

    // Fallback: Legacy check from platform DB
    if (!companyId) {
      return NextResponse.json({ error: 'معرف الشركة أو المستأجر مطلوب' }, { status: 400 })
    }

    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { id: true, tenantId: true },
    })

    if (!company) {
      return NextResponse.json({ error: 'الشركة غير موجودة' }, { status: 404 })
    }

    if (!company.tenantId) {
      return NextResponse.json({
        active: true, type: 'enterprise', expiresAt: null, daysLeft: null,
        isTrial: false, tenantStatus: 'active',
      })
    }

    // Try LicenseStore check for the tenant
    try {
      const tenantDb = await getTenantDb(company.tenantId)
      const status = await checkLicenseValid(tenantDb, company.tenantId)
      return NextResponse.json({
        active: status.active,
        type: status.type,
        expiresAt: status.expiresAt,
        daysLeft: status.daysRemaining === Infinity ? null : status.daysRemaining,
        isTrial: status.isTrial,
        isLifetime: status.isLifetime,
        tenantStatus: status.locked ? 'suspended' : 'active',
        licenseKey: status.licenseKey,
        maxUsers: status.maxUsers,
        maxCompanies: status.maxCompanies,
        locked: status.locked,
        reason: status.reason,
      })
    } catch (e) {
      // Fallback to platform DB check
      console.error('LicenseStore check failed, falling back to platform DB:', e)
    }

    const tenant = await db.tenant.findUnique({
      where: { id: company.tenantId },
      include: { licenses: { where: { status: 'active' }, orderBy: { createdAt: 'desc' }, take: 1 } },
    })

    if (!tenant || tenant.status === 'suspended' || tenant.status === 'cancelled') {
      return NextResponse.json({ active: false, type: null, expiresAt: null, daysLeft: 0, isTrial: false, tenantStatus: tenant?.status || 'cancelled', locked: true, reason: 'NO_LICENSE' })
    }

    const license = tenant.licenses[0]
    if (!license) {
      return NextResponse.json({ active: false, type: null, expiresAt: null, daysLeft: 0, isTrial: false, tenantStatus: tenant.status, locked: true, reason: 'NO_LICENSE' })
    }

    const now = new Date()
    const expiresAtDate = new Date(license.expiresAt)
    const daysLeft = Math.max(0, Math.ceil((expiresAtDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    const isExpired = !license.isLifetime && expiresAtDate < now

    return NextResponse.json({
      active: !isExpired,
      type: license.type,
      expiresAt: license.expiresAt,
      daysLeft,
      isTrial: license.type === 'trial',
      isLifetime: license.isLifetime,
      tenantStatus: tenant.status,
      licenseKey: license.key,
      maxUsers: license.maxUsers,
      maxCompanies: license.maxCompanies,
      locked: isExpired,
      reason: isExpired ? 'LICENSE_EXPIRED' : undefined,
    })
  } catch (error) {
    console.error('License check error:', error)
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
