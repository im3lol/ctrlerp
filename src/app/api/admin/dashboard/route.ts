import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-guard'
import { cached, CACHE_TTL } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth(request)

    // Use cached dashboard data - 30 second TTL
    const data = await cached('admin:dashboard', CACHE_TTL.DASHBOARD_STATS, () => computeDashboardData())

    return NextResponse.json(data)
  } catch (error) {
    console.error('Admin dashboard error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: message.includes('غير مصرح') ? 401 : 500 })
  }
}

async function computeDashboardData() {
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // ══════════════════════════════════════════════════
  // ALL queries in parallel - no sequential queries
  // ══════════════════════════════════════════════════
  const [
    tenantStatusDistribution,
    licenseTypeDistribution,
    licenseStatusDistribution,
    revenueByType,
    revenueRecordStats,
    recentActivities,
    tenantTimeData,
    revenueTimeData,
    systemCounts,
    expirationData,
    recentTenants,
    monthlyRevenueAgg,
    todayData,
    systemHealthData,
    activePaidTenants,
  ] = await Promise.all([
    // 1. Tenant counts by status
    db.tenant.groupBy({
      by: ['status'],
      _count: { status: true },
    }),

    // 2. License counts by type with revenue
    db.license.groupBy({
      by: ['type'],
      _count: { id: true },
      _sum: { price: true, monthlyPrice: true },
    }),

    // 3. License counts by status
    db.license.groupBy({
      by: ['status'],
      _count: { id: true },
    }),

    // 4. Revenue by license type (active, price > 0)
    db.license.groupBy({
      by: ['type'],
      where: { status: 'active', price: { gt: 0 } },
      _sum: { price: true, monthlyPrice: true },
      _count: { id: true },
    }),

    // 5. Revenue record aggregates
    db.revenueRecord.aggregate({
      _sum: { amount: true },
      _count: { id: true },
    }),

    // 6. Recent activity logs
    db.activityLog.findMany({
      take: 15,
      orderBy: { createdAt: 'desc' },
    }),

    // 7. Tenant creation data for growth chart
    db.tenant.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),

    // 8. Revenue records for trends
    db.revenueRecord.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { amount: true, type: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),

    // 9. System usage counts (single raw query)
    db.$queryRaw<
      { users: bigint; companies: bigint; sales_invoices: bigint; purchase_invoices: bigint; items: bigint; customers: bigint; suppliers: bigint }
    >`
      SELECT
        (SELECT COUNT(*) FROM "User") as users,
        (SELECT COUNT(*) FROM "Company") as companies,
        (SELECT COUNT(*) FROM "SalesInvoice") as sales_invoices,
        (SELECT COUNT(*) FROM "PurchaseInvoice") as purchase_invoices,
        (SELECT COUNT(*) FROM "Item") as items,
        (SELECT COUNT(*) FROM "Customer") as customers,
        (SELECT COUNT(*) FROM "Supplier") as suppliers
    `,

    // 10. License expiration data
    db.license.findMany({
      where: {
        status: 'active',
        isLifetime: false,
        expiresAt: { lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
      },
      select: {
        id: true,
        key: true,
        type: true,
        expiresAt: true,
        tenant: { select: { id: true, name: true, email: true } },
      },
      orderBy: { expiresAt: 'asc' },
    }),

    // 11. Recent tenants with license info
    db.tenant.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        licenses: { take: 1, orderBy: { createdAt: 'desc' } },
        _count: { select: { companies: true } },
        owner: { select: { id: true, name: true, username: true } },
      },
    }),

    // 12. Monthly revenue aggregates
    db.$queryRaw<
      { month: Date; total: number }[]
    >`
      SELECT DATE_TRUNC('month', "createdAt") as month, SUM(amount) as total
      FROM "RevenueRecord"
      WHERE "createdAt" >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `,

    // 13. Today stats (parallelized)
    Promise.all([
      db.tenant.count({ where: { createdAt: { gte: todayStart } } }),
      db.revenueRecord.aggregate({
        where: { createdAt: { gte: todayStart } },
        _sum: { amount: true },
      }),
      db.license.count({ where: { createdAt: { gte: todayStart } } }),
    ]),

    // 14. System health check + active users (parallelized)
    Promise.all([
      (async () => {
        try {
          await db.$queryRaw`SELECT 1`
          return 'connected' as const
        } catch {
          return 'disconnected' as const
        }
      })(),
      db.platformAdminToken.count({ where: { createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } }),
      db.platformAdminToken.count({ where: { createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } } }),
    ]),

    // 15. Active paid tenants count (was sequential before - now parallel)
    db.tenant.count({
      where: {
        status: 'active',
        licenses: { some: { status: 'active', type: { in: ['basic', 'professional', 'enterprise', 'lifetime'] } } },
      },
    }),
  ])

  // ══════════════════════════════════════════════════
  // COMPUTE: Derive all values from collected data
  // ══════════════════════════════════════════════════

  const totalTenants = tenantStatusDistribution.reduce((s, t) => s + t._count.status, 0)
  const activeTenants = tenantStatusDistribution.find(t => t.status === 'active')?._count.status || 0
  const expiredTenants = tenantStatusDistribution.filter(t => ['suspended', 'cancelled'].includes(t.status)).reduce((s, t) => s + t._count.status, 0)
  const cancelledTenants = tenantStatusDistribution.find(t => t.status === 'cancelled')?._count.status || 0

  const trialTenants = licenseTypeDistribution.find(l => l.type === 'trial')?._count.id || 0
  const lifetimeTenants = licenseTypeDistribution.find(l => l.type === 'lifetime')?._count.id || 0
  const activePaidLicenses = licenseTypeDistribution
    .filter(l => ['basic', 'professional', 'enterprise', 'lifetime'].includes(l.type))
    .reduce((s, l) => s + l._count.id, 0)

  const totalRevenue = revenueByType.reduce((s, r) => s + (r._sum.price || 0), 0)
  const monthlyRecurring = licenseTypeDistribution
    .filter(l => l.type !== 'trial')
    .reduce((s, l) => s + (l._sum.monthlyPrice || 0), 0)
  const lifetimeRevenue = revenueByType
    .filter(r => r.type === 'lifetime')
    .reduce((s, r) => s + (r._sum.price || 0), 0)

  // --- Revenue trends from monthly aggregates ---
  const revenueByMonth: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${months[d.getMonth()]} ${d.getFullYear()}`
    revenueByMonth[key] = 0
  }
  monthlyRevenueAgg.forEach(r => {
    const d = new Date(r.month)
    const key = `${months[d.getMonth()]} ${d.getFullYear()}`
    if (key in revenueByMonth) {
      revenueByMonth[key] = Number(r.total)
    }
  })
  // Use raw records only as fallback when aggregates are 0
  revenueTimeData.forEach(r => {
    const d = new Date(r.createdAt)
    const key = `${months[d.getMonth()]} ${d.getFullYear()}`
    if (key in revenueByMonth && revenueByMonth[key] === 0) {
      revenueByMonth[key] += r.amount
    }
  })
  const revenueTrend = Object.entries(revenueByMonth).map(([month, amount]) => ({ month, amount }))

  // --- Tenant growth ---
  const tenantGrowthByMonth: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${months[d.getMonth()]} ${d.getFullYear()}`
    tenantGrowthByMonth[key] = 0
  }
  tenantTimeData.forEach(t => {
    const d = new Date(t.createdAt)
    const key = `${months[d.getMonth()]} ${d.getFullYear()}`
    if (key in tenantGrowthByMonth) {
      tenantGrowthByMonth[key]++
    }
  })
  let cumulative = totalTenants - tenantTimeData.length
  const tenantGrowth = Object.entries(tenantGrowthByMonth).map(([month, count]) => {
    cumulative += count
    return { month, count: cumulative }
  })

  const newTenantsThisMonth = tenantTimeData.filter(t => new Date(t.createdAt) >= thisMonthStart).length
  const newTenantsLastMonth = tenantTimeData.filter(t => {
    const d = new Date(t.createdAt)
    return d >= lastMonthStart && d < thisMonthStart
  }).length

  const revenueThisMonth = revenueTimeData.filter(r => new Date(r.createdAt) >= thisMonthStart).reduce((s, r) => s + r.amount, 0)
  const revenueLastMonth = revenueTimeData.filter(r => {
    const d = new Date(r.createdAt)
    return d >= lastMonthStart && d < thisMonthStart
  }).reduce((s, r) => s + r.amount, 0)

  const sysCounts = systemCounts[0]

  const oneDayLater = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const expiringLicenses = expirationData
    .filter(l => l.expiresAt > now && l.expiresAt <= sevenDaysLater)
    .slice(0, 10)
  const recentlyExpired = expirationData
    .filter(l => l.expiresAt < now)
    .slice(0, 10)

  const licenseWarnings = {
    expiring1Day: expirationData.filter(l => l.expiresAt > now && l.expiresAt <= oneDayLater).length,
    expiring3Days: expirationData.filter(l => l.expiresAt > now && l.expiresAt <= threeDaysLater).length,
    expiring7Days: expirationData.filter(l => l.expiresAt > now && l.expiresAt <= sevenDaysLater).length,
    expiring14Days: expirationData.filter(l => l.expiresAt > now && l.expiresAt <= fourteenDaysLater).length,
    expiring30Days: expirationData.filter(l => l.expiresAt > now && l.expiresAt <= thirtyDaysLater).length,
  }

  const totalTrialLicenses = licenseTypeDistribution.find(l => l.type === 'trial')?._count.id || 0
  const convertedTrialTypes = licenseTypeDistribution
    .filter(l => ['basic', 'professional', 'enterprise', 'lifetime'].includes(l.type))
    .reduce((s, l) => s + l._count.id, 0)
  const trialConversionRate = totalTrialLicenses > 0
    ? Math.round((convertedTrialTypes / totalTrialLicenses) * 100)
    : 0

  const churnRate = totalTenants > 0
    ? Math.round((cancelledTenants / totalTenants) * 10000) / 100
    : 0

  const averageRevenuePerUser = activePaidTenants > 0
    ? Math.round(((revenueRecordStats._sum.amount || 0) / activePaidTenants) * 100) / 100
    : 0

  const [dbStatus, activeUsersLast24h, activeUsersLast7d] = systemHealthData

  const systemHealth = {
    dbStatus,
    uptime: {
      seconds: Math.round(process.uptime()),
      formatted: `${Math.floor(process.uptime() / 86400)}d ${Math.floor((process.uptime() % 86400) / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
    },
    memoryUsage: {
      rss: Math.round((process.memoryUsage().rss / 1024 / 1024) * 100) / 100,
      heapTotal: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
      heapUsed: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
      external: Math.round((process.memoryUsage().external / 1024 / 1024) * 100) / 100,
    },
    activeUsersLast24h,
    activeUsersLast7d,
  }

  const [newTenantsToday, revenueToday, newLicensesToday] = todayData

  return {
    stats: {
      totalTenants,
      activeTenants,
      trialTenants,
      expiredTenants,
      activePaidLicenses,
      lifetimeTenants,
      totalUsers: Number(sysCounts.users),
      totalCompanies: Number(sysCounts.companies),
      totalInvoices: Number(sysCounts.sales_invoices),
      totalPurchaseInvoices: Number(sysCounts.purchase_invoices),
      totalItems: Number(sysCounts.items),
      totalCustomers: Number(sysCounts.customers),
      totalSuppliers: Number(sysCounts.suppliers),
      trialConversionRate,
    },
    revenue: {
      totalRevenue,
      monthlyRecurring,
      lifetimeRevenue,
      activePaidCount: revenueByType.reduce((s, r) => s + r._count.id, 0),
      totalFromRecords: revenueRecordStats._sum.amount || 0,
      thisMonth: revenueThisMonth,
      lastMonth: revenueLastMonth,
    },
    growth: {
      newTenantsThisMonth,
      newTenantsLastMonth,
      tenantGrowthPercent: newTenantsLastMonth > 0
        ? Math.round(((newTenantsThisMonth - newTenantsLastMonth) / newTenantsLastMonth) * 100)
        : newTenantsThisMonth > 0 ? 100 : 0,
      revenueGrowthPercent: revenueLastMonth > 0
        ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
        : revenueThisMonth > 0 ? 100 : 0,
    },
    charts: {
      revenueTrend,
      tenantGrowth,
      revenueByType: revenueByType.map(r => ({
        type: r.type,
        totalRevenue: r._sum.price || 0,
        monthlyRecurring: r._sum.monthlyPrice || 0,
        count: r._count.id,
      })),
      licenseDistribution: licenseTypeDistribution.map((l) => ({
        type: l.type,
        count: l._count.id,
      })),
      licenseStatusDistribution: licenseStatusDistribution.map((l) => ({
        status: l.status,
        count: l._count.id,
      })),
    },
    alerts: {
      expiringLicenses: expiringLicenses.map(l => ({
        id: l.id,
        key: l.key,
        type: l.type,
        expiresAt: l.expiresAt,
        daysLeft: Math.max(0, Math.ceil((new Date(l.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
        tenant: l.tenant,
      })),
      recentlyExpired: recentlyExpired.map(l => ({
        id: l.id,
        key: l.key,
        type: l.type,
        expiresAt: l.expiresAt,
        tenant: l.tenant,
      })),
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
    recentActivities: recentActivities.map(a => ({
      id: a.id,
      action: a.action,
      category: a.category,
      description: a.description,
      performerName: a.performerName,
      targetName: a.targetName,
      createdAt: a.createdAt,
    })),
    systemHealth,
    licenseWarnings,
    churnRate,
    averageRevenuePerUser,
    todayStats: {
      newTenants: newTenantsToday,
      revenue: revenueToday._sum.amount || 0,
      newLicenses: newLicensesToday,
    },
  }
}
