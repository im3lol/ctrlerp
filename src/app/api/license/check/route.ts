import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: Check license status for current company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'معرف الشركة مطلوب' }, { status: 400 })
    }

    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { id: true, tenantId: true },
    })

    if (!company) {
      return NextResponse.json({ error: 'الشركة غير موجودة' }, { status: 404 })
    }

    // If no tenant, allow access (legacy companies without tenant)
    if (!company.tenantId) {
      return NextResponse.json({
        active: true,
        type: 'enterprise',
        expiresAt: null,
        daysLeft: null,
        isTrial: false,
        tenantStatus: 'active',
      })
    }

    const tenant = await db.tenant.findUnique({
      where: { id: company.tenantId },
      include: {
        licenses: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!tenant) {
      return NextResponse.json({
        active: false,
        type: null,
        expiresAt: null,
        daysLeft: 0,
        isTrial: false,
        tenantStatus: 'cancelled',
      })
    }

    // Check tenant status
    if (tenant.status === 'suspended' || tenant.status === 'cancelled') {
      return NextResponse.json({
        active: false,
        type: null,
        expiresAt: null,
        daysLeft: 0,
        isTrial: false,
        tenantStatus: tenant.status,
      })
    }

    // Check for active license
    const license = tenant.licenses[0]

    if (!license) {
      return NextResponse.json({
        active: false,
        type: null,
        expiresAt: null,
        daysLeft: 0,
        isTrial: false,
        tenantStatus: tenant.status,
      })
    }

    const now = new Date()
    const expiresAt = new Date(license.expiresAt)
    const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    const isExpired = expiresAt < now

    return NextResponse.json({
      active: !isExpired,
      type: license.type,
      expiresAt: license.expiresAt,
      daysLeft,
      isTrial: license.type === 'trial',
      tenantStatus: tenant.status,
      licenseKey: license.key,
      maxUsers: license.maxUsers,
      maxCompanies: license.maxCompanies,
    })
  } catch (error) {
    console.error('License check error:', error)
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
