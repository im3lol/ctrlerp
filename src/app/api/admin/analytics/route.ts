import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-guard'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth(request)

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '6m' // 1m, 3m, 6m, 1y, all

    const monthsMap: Record<string, number> = {
      '1m': 1,
      '3m': 3,
      '6m': 6,
      '1y': 12,
      'all': 24,
    }

    const monthsCount = monthsMap[period] || 6
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - monthsCount)

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    // ── Revenue trends by month ──
    const revenueRecords = await db.revenueRecord.findMany({
      where: { createdAt: { gte: startDate } },
      orderBy: { createdAt: 'asc' },
    })

    const revenueByMonth: Record<string, { subscription: number; lifetime: number; renewal: number; other: number; total: number }> = {}

    // Initialize all months
    for (let i = monthsCount; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`
      revenueByMonth[key] = { subscription: 0, lifetime: 0, renewal: 0, other: 0, total: 0 }
    }

    revenueRecords.forEach(r => {
      const d = new Date(r.createdAt)
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`
      if (key in revenueByMonth) {
        revenueByMonth[key].total += r.amount
        if (r.type === 'subscription') revenueByMonth[key].subscription += r.amount
        else if (r.type === 'lifetime') revenueByMonth[key].lifetime += r.amount
        else if (r.type === 'renewal') revenueByMonth[key].renewal += r.amount
        else revenueByMonth[key].other += r.amount
      }
    })

    const revenueTrends = Object.entries(revenueByMonth).map(([month, data]) => ({
      month,
      ...data,
    }))

    // ── Tenant growth by month ──
    const allTenants = await db.tenant.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    })

    const totalAllTenants = await db.tenant.count()

    const tenantByMonth: Record<string, { newTenants: number; activeTenants: number; suspendedTenants: number }> = {}

    for (let i = monthsCount; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`
      tenantByMonth[key] = { newTenants: 0, activeTenants: 0, suspendedTenants: 0 }
    }

    allTenants.forEach(t => {
      const d = new Date(t.createdAt)
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`
      if (key in tenantByMonth) {
        tenantByMonth[key].newTenants++
        if (t.status === 'active') tenantByMonth[key].activeTenants++
        else if (t.status === 'suspended') tenantByMonth[key].suspendedTenants++
      }
    })

    let cumulative = totalAllTenants - allTenants.length
    const tenantGrowth = Object.entries(tenantByMonth).map(([month, data]) => {
      cumulative += data.newTenants
      return { month, ...data, totalTenants: cumulative }
    })

    // ── License type distribution ──
    const licenseTypeDistribution = await db.license.groupBy({
      by: ['type'],
      _count: { id: true },
      _sum: { price: true, monthlyPrice: true },
    })

    // ── License status distribution ──
    const licenseStatusDistribution = await db.license.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    // ── Revenue by license type ──
    const revenueByLicenseType = licenseTypeDistribution.map(lt => ({
      type: lt.type,
      count: lt._count.id,
      totalRevenue: lt._sum.price || 0,
      monthlyRecurring: lt._sum.monthlyPrice || 0,
    }))

    // ── Top tenants by revenue ──
    const topTenantsByRevenue = await db.revenueRecord.groupBy({
      by: ['tenantId'],
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    })

    const tenantIds = topTenantsByRevenue.map(t => t.tenantId)
    const tenantDetails = await db.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true, email: true, status: true },
    })

    const topTenants = topTenantsByRevenue.map(tt => ({
      ...tenantDetails.find(t => t.id === tt.tenantId),
      totalRevenue: tt._sum.amount || 0,
      recordCount: tt._count.id,
    }))

    // ── System usage overview ──
    const totalUsers = await db.user.count()
    const activeUsers = await db.user.count({ where: { isActive: true } })
    const totalCompanies = await db.company.count()
    const totalSalesInvoices = await db.salesInvoice.count()
    const totalPurchaseInvoices = await db.purchaseInvoice.count()
    const totalItems = await db.item.count()
    const totalCustomers = await db.customer.count()
    const totalSuppliers = await db.supplier.count()

    // ── Users per tenant ──
    const usersPerTenant = await db.tenant.findMany({
      include: {
        _count: { select: { companies: true } },
        companies: {
          include: {
            _count: { select: { companyUsers: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const tenantUsage = usersPerTenant.map(t => ({
      id: t.id,
      name: t.name,
      status: t.status,
      companyCount: t._count.companies,
      userCount: t.companies.reduce((sum, c) => sum + c._count.companyUsers, 0),
    }))

    // ── MRR calculation ──
    const activeMonthlyLicenses = await db.license.findMany({
      where: {
        status: 'active',
        isLifetime: false,
        type: { not: 'trial' },
        monthlyPrice: { gt: 0 },
      },
      select: { monthlyPrice: true, currency: true },
    })

    const mrr = activeMonthlyLicenses
      .filter(l => l.currency === 'EGP')
      .reduce((sum, l) => sum + l.monthlyPrice, 0)

    // ── ARR (Annual Recurring Revenue) ──
    const arr = mrr * 12

    // ── Trial conversion funnel ──
    const totalTrials = await db.license.count({ where: { type: 'trial' } })
    const trialToBasic = await db.license.count({ where: { type: 'basic' } })
    const trialToPro = await db.license.count({ where: { type: 'professional' } })
    const trialToEnterprise = await db.license.count({ where: { type: 'enterprise' } })
    const trialToLifetime = await db.license.count({ where: { type: 'lifetime' } })

    return NextResponse.json({
      revenueTrends,
      tenantGrowth,
      licenseTypeDistribution: licenseTypeDistribution.map(l => ({
        type: l.type,
        count: l._count.id,
      })),
      licenseStatusDistribution: licenseStatusDistribution.map(l => ({
        status: l.status,
        count: l._count.id,
      })),
      revenueByLicenseType,
      topTenants,
      systemUsage: {
        totalUsers,
        activeUsers,
        totalCompanies,
        totalSalesInvoices,
        totalPurchaseInvoices,
        totalItems,
        totalCustomers,
        totalSuppliers,
      },
      tenantUsage,
      mrr,
      arr,
      trialConversion: {
        totalTrials,
        trialToBasic,
        trialToPro,
        trialToEnterprise,
        trialToLifetime,
        conversionRate: totalTrials > 0
          ? Math.round(((trialToBasic + trialToPro + trialToEnterprise + trialToLifetime) / totalTrials) * 100)
          : 0,
      },
    })
  } catch (error) {
    console.error('Analytics error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: message.includes('غير مصرح') ? 401 : 500 })
  }
}
