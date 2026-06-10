import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-guard'

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminAuth(request)

    // Total tenants
    const totalTenants = await db.tenant.count()

    // Active tenants
    const activeTenants = await db.tenant.count({
      where: { status: 'active' },
    })

    // Trial tenants (tenants with at least one trial license)
    const trialTenants = await db.tenant.count({
      where: {
        licenses: {
          some: { type: 'trial' },
        },
      },
    })

    // Expired/suspended tenants
    const expiredTenants = await db.tenant.count({
      where: { status: { in: ['suspended', 'cancelled'] } },
    })

    // Recent tenants (last 5)
    const recentTenants = await db.tenant.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        licenses: { take: 1, orderBy: { createdAt: 'desc' } },
        _count: {
          select: { companies: true },
        },
        owner: {
          select: { id: true, name: true, username: true },
        },
      },
    })

    // License type distribution
    const licenseDistribution = await db.license.groupBy({
      by: ['type'],
      _count: { type: true },
    })

    // License status distribution
    const licenseStatusDistribution = await db.license.groupBy({
      by: ['status'],
      _count: { status: true },
    })

    // Total active paid licenses count
    const activePaidLicenses = await db.license.count({
      where: {
        status: 'active',
        type: { in: ['basic', 'professional', 'enterprise'] },
      },
    })

    return NextResponse.json({
      stats: {
        totalTenants,
        activeTenants,
        trialTenants,
        expiredTenants,
        activePaidLicenses,
      },
      recentTenants: recentTenants.map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        phone: t.phone,
        status: t.status,
        createdAt: t.createdAt,
        owner: t.owner,
        companyCount: t._count.companies,
        license: t.licenses[0] || null,
      })),
      licenseDistribution: licenseDistribution.map((l) => ({
        type: l.type,
        count: l._count.type,
      })),
      licenseStatusDistribution: licenseStatusDistribution.map((l) => ({
        status: l.status,
        count: l._count.status,
      })),
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: message.includes('غير مصرح') ? 401 : 500 })
  }
}
