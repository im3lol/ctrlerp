import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-guard'
import { cached, CACHE_TTL } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth(request)

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '6m'

    const cacheKey = `admin:analytics:${period}`
    const data = await cached(cacheKey, CACHE_TTL.ANALYTICS, () =>
      computeAnalyticsData(period)
    )

    return NextResponse.json(data)
  } catch (error) {
    console.error('Analytics error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: message.includes('غير مصرح') ? 401 : 500 })
  }
}

async function computeAnalyticsData(period: string) {
  const monthsMap: Record<string, number> = {
    '1m': 1, '3m': 3, '6m': 6, '1y': 12, 'all': 24,
  }
  const monthsCount = monthsMap[period] || 6
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - monthsCount)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // ══════════════════════════════════════════════════
  // ALL queries in parallel - including dependent ones resolved with raw SQL
  // ══════════════════════════════════════════════════
  const [
    revenueRecords,
    tenantTimeData,
    licenseTypeDistribution,
    licenseStatusDistribution,
    topTenantsByRevenue,
    systemCounts,
    mrrData,
    totalAllTenants,
    tenantUsage,
  ] = await Promise.all([
    // 1. Revenue records for trends (use aggregate instead of fetching all records when possible)
    db.revenueRecord.findMany({
      where: { createdAt: { gte: startDate } },
      select: { amount: true, type: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),

    // 2. Tenant creation data
    db.tenant.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    }),

    // 3. License type distribution with revenue
    db.license.groupBy({
      by: ['type'],
      _count: { id: true },
      _sum: { price: true, monthlyPrice: true },
    }),

    // 4. License status distribution
    db.license.groupBy({
      by: ['status'],
      _count: { id: true },
    }),

    // 5. Top tenants by revenue
    db.revenueRecord.groupBy({
      by: ['tenantId'],
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    }),

    // 6. System usage counts - single raw query
    db.$queryRaw<
      { users: bigint; active_users: bigint; companies: bigint; sales_invoices: bigint; purchase_invoices: bigint; items: bigint; customers: bigint; suppliers: bigint }
    >`
      SELECT
        (SELECT COUNT(*) FROM "User") as users,
        (SELECT COUNT(*) FROM "User" WHERE "isActive" = true) as active_users,
        (SELECT COUNT(*) FROM "Company") as companies,
        (SELECT COUNT(*) FROM "SalesInvoice") as sales_invoices,
        (SELECT COUNT(*) FROM "PurchaseInvoice") as purchase_invoices,
        (SELECT COUNT(*) FROM "Item") as items,
        (SELECT COUNT(*) FROM "Customer") as customers,
        (SELECT COUNT(*) FROM "Supplier") as suppliers
    `,

    // 7. MRR calculation
    db.license.aggregate({
      where: {
        status: 'active',
        isLifetime: false,
        type: { not: 'trial' },
        monthlyPrice: { gt: 0 },
        currency: 'EGP',
      },
      _sum: { monthlyPrice: true },
    }),

    // 8. Total tenants count (was sequential before)
    db.tenant.count(),

    // 9. Tenant usage - using raw SQL (was conditional + sequential before)
    db.$queryRaw<
      { id: string; name: string; status: string; company_count: bigint; user_count: bigint }[]
    >`
      SELECT 
        t.id,
        t.name,
        t.status,
        COUNT(DISTINCT c.id) as company_count,
        COUNT(DISTINCT cu."userId") as user_count
      FROM "Tenant" t
      LEFT JOIN "Company" c ON c."tenantId" = t.id
      LEFT JOIN "CompanyUser" cu ON cu."companyId" = c.id
      GROUP BY t.id, t.name, t.status
      ORDER BY t."createdAt" DESC
      LIMIT 20
    `,
  ])

  // ══════════════════════════════════════════════════
  // Only dependent query: tenant details for top tenants
  // ══════════════════════════════════════════════════
  const tenantIds = topTenantsByRevenue.map(t => t.tenantId)
  const tenantDetails = tenantIds.length > 0
    ? await db.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true, name: true, email: true, status: true },
      })
    : []

  // ══════════════════════════════════════════════════
  // COMPUTE: Derive all values from collected data
  // ══════════════════════════════════════════════════

  const revenueByMonth: Record<string, { subscription: number; lifetime: number; renewal: number; other: number; total: number }> = {}
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
  const revenueTrends = Object.entries(revenueByMonth).map(([month, data]) => ({ month, ...data }))

  const tenantByMonth: Record<string, { newTenants: number; activeTenants: number; suspendedTenants: number }> = {}
  for (let i = monthsCount; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${months[d.getMonth()]} ${d.getFullYear()}`
    tenantByMonth[key] = { newTenants: 0, activeTenants: 0, suspendedTenants: 0 }
  }
  tenantTimeData.forEach(t => {
    const d = new Date(t.createdAt)
    const key = `${months[d.getMonth()]} ${d.getFullYear()}`
    if (key in tenantByMonth) {
      tenantByMonth[key].newTenants++
      if (t.status === 'active') tenantByMonth[key].activeTenants++
      else if (t.status === 'suspended') tenantByMonth[key].suspendedTenants++
    }
  })
  let cumulative = totalAllTenants - tenantTimeData.length
  const tenantGrowth = Object.entries(tenantByMonth).map(([month, data]) => {
    cumulative += data.newTenants
    return { month, ...data, totalTenants: cumulative }
  })

  const revenueByLicenseType = licenseTypeDistribution.map(lt => ({
    type: lt.type,
    count: lt._count.id,
    totalRevenue: lt._sum.price || 0,
    monthlyRecurring: lt._sum.monthlyPrice || 0,
  }))

  const topTenants = topTenantsByRevenue.map(tt => ({
    ...tenantDetails.find(t => t.id === tt.tenantId),
    totalRevenue: tt._sum.amount || 0,
    recordCount: tt._count.id,
  }))

  const sc = systemCounts[0]
  const mrr = Number(mrrData._sum.monthlyPrice || 0)
  const arr = mrr * 12

  const totalTrials = licenseTypeDistribution.find(l => l.type === 'trial')?._count.id || 0
  const trialToBasic = licenseTypeDistribution.find(l => l.type === 'basic')?._count.id || 0
  const trialToPro = licenseTypeDistribution.find(l => l.type === 'professional')?._count.id || 0
  const trialToEnterprise = licenseTypeDistribution.find(l => l.type === 'enterprise')?._count.id || 0
  const trialToLifetime = licenseTypeDistribution.find(l => l.type === 'lifetime')?._count.id || 0

  return {
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
      totalUsers: Number(sc.users),
      activeUsers: Number(sc.active_users),
      totalCompanies: Number(sc.companies),
      totalSalesInvoices: Number(sc.sales_invoices),
      totalPurchaseInvoices: Number(sc.purchase_invoices),
      totalItems: Number(sc.items),
      totalCustomers: Number(sc.customers),
      totalSuppliers: Number(sc.suppliers),
    },
    tenantUsage: tenantUsage.map(t => ({
      id: t.id,
      name: t.name,
      status: t.status,
      companyCount: Number(t.company_count),
      userCount: Number(t.user_count),
    })),
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
  }
}
