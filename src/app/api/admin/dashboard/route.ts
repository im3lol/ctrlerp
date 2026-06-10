import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-guard'

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminAuth(request)

    // ── Basic Stats ──
    const totalTenants = await db.tenant.count()
    const activeTenants = await db.tenant.count({ where: { status: 'active' } })
    const trialTenants = await db.tenant.count({
      where: { licenses: { some: { type: 'trial', status: 'active' } } },
    })
    const expiredTenants = await db.tenant.count({ where: { status: { in: ['suspended', 'cancelled'] } } })

    // ── Lifetime tenants ──
    const lifetimeTenants = await db.tenant.count({
      where: { licenses: { some: { isLifetime: true, status: 'active' } } },
    })

    // ── Active paid licenses count ──
    const activePaidLicenses = await db.license.count({
      where: {
        status: 'active',
        type: { in: ['basic', 'professional', 'enterprise', 'lifetime'] },
      },
    })

    // ── License distributions ──
    const licenseDistribution = await db.license.groupBy({
      by: ['type'],
      _count: { type: true },
    })

    const licenseStatusDistribution = await db.license.groupBy({
      by: ['status'],
      _count: { status: true },
    })

    // ── Revenue Stats ──
    const allActiveLicenses = await db.license.findMany({
      where: { status: 'active' },
      select: { price: true, monthlyPrice: true, currency: true, type: true, isLifetime: true },
    })

    const totalRevenue = allActiveLicenses
      .filter(l => l.price > 0)
      .reduce((sum, l) => sum + l.price, 0)

    const monthlyRecurring = allActiveLicenses
      .filter(l => !l.isLifetime && l.type !== 'trial' && l.monthlyPrice > 0)
      .reduce((sum, l) => sum + l.monthlyPrice, 0)

    const lifetimeRevenue = allActiveLicenses
      .filter(l => l.isLifetime && l.price > 0)
      .reduce((sum, l) => sum + l.price, 0)

    // ── Revenue records for trends ──
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const revenueRecords = await db.revenueRecord.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      orderBy: { createdAt: 'asc' },
    })

    // Group revenue by month
    const revenueByMonth: Record<string, number> = {}
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`
      revenueByMonth[key] = 0
    }

    revenueRecords.forEach(r => {
      const d = new Date(r.createdAt)
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`
      if (key in revenueByMonth) {
        revenueByMonth[key] += r.amount
      }
    })

    const revenueTrend = Object.entries(revenueByMonth).map(([month, amount]) => ({
      month,
      amount,
    }))

    // ── Tenant growth by month ──
    const tenantGrowthRaw = await db.tenant.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    const tenantGrowthByMonth: Record<string, number> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`
      tenantGrowthByMonth[key] = 0
    }
    tenantGrowthRaw.forEach(t => {
      const d = new Date(t.createdAt)
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`
      if (key in tenantGrowthByMonth) {
        tenantGrowthByMonth[key]++
      }
    })

    // Cumulative growth
    let cumulative = totalTenants - tenantGrowthRaw.length
    const tenantGrowth = Object.entries(tenantGrowthByMonth).map(([month, count]) => {
      cumulative += count
      return { month, count: cumulative }
    })

    // ── System usage metrics ──
    const totalUsers = await db.user.count()
    const totalCompanies = await db.company.count()
    const totalInvoices = await db.salesInvoice.count()
    const totalPurchaseInvoices = await db.purchaseInvoice.count()
    const totalItems = await db.item.count()
    const totalCustomers = await db.customer.count()
    const totalSuppliers = await db.supplier.count()

    // ── Expiring soon licenses (within 7 days) ──
    const sevenDaysLater = new Date()
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)

    const expiringLicenses = await db.license.findMany({
      where: {
        status: 'active',
        isLifetime: false,
        expiresAt: { lte: sevenDaysLater, gt: new Date() },
      },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
      },
      orderBy: { expiresAt: 'asc' },
      take: 10,
    })

    // ── Recently expired licenses ──
    const recentlyExpired = await db.license.findMany({
      where: {
        status: 'active',
        isLifetime: false,
        expiresAt: { lt: new Date() },
      },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
      },
      orderBy: { expiresAt: 'desc' },
      take: 10,
    })

    // ── Recent activity logs ──
    const recentActivities = await db.activityLog.findMany({
      take: 15,
      orderBy: { createdAt: 'desc' },
    })

    // ── Recent tenants ──
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

    // ── Trial conversion rate ──
    const totalTrialLicenses = await db.license.count({ where: { type: 'trial' } })
    const convertedTrials = await db.license.count({
      where: {
        type: { in: ['basic', 'professional', 'enterprise', 'lifetime'] },
        tenant: { licenses: { some: { type: 'trial' } } },
      },
    })
    const trialConversionRate = totalTrialLicenses > 0
      ? Math.round((convertedTrials / totalTrialLicenses) * 100)
      : 0

    // ── Revenue by license type ──
    const revenueByType = await db.license.groupBy({
      by: ['type'],
      where: { status: 'active', price: { gt: 0 } },
      _sum: { price: true, monthlyPrice: true },
      _count: { id: true },
    })

    // ── Revenue records total from DB ──
    const totalRevenueFromRecords = await db.revenueRecord.aggregate({
      _sum: { amount: true },
    })

    // ── Revenue this month ──
    const thisMonthStart = new Date()
    thisMonthStart.setDate(1)
    thisMonthStart.setHours(0, 0, 0, 0)

    const revenueThisMonth = await db.revenueRecord.aggregate({
      where: { createdAt: { gte: thisMonthStart } },
      _sum: { amount: true },
    })

    // ── Revenue last month ──
    const lastMonthStart = new Date()
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1)
    lastMonthStart.setDate(1)
    lastMonthStart.setHours(0, 0, 0, 0)

    const revenueLastMonth = await db.revenueRecord.aggregate({
      where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } },
      _sum: { amount: true },
    })

    // ── New tenants this month ──
    const newTenantsThisMonth = await db.tenant.count({
      where: { createdAt: { gte: thisMonthStart } },
    })

    // ── New tenants last month ──
    const newTenantsLastMonth = await db.tenant.count({
      where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } },
    })

    // ══════════════════════════════════════════════════
    // NEW: System Health
    // ══════════════════════════════════════════════════
    let dbStatus = 'connected'
    try {
      await db.$queryRaw`SELECT 1`
    } catch {
      dbStatus = 'disconnected'
    }

    const uptimeSeconds = process.uptime()
    const memUsage = process.memoryUsage()

    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [activeUsersLast24h, activeUsersLast7d] = await Promise.all([
      db.platformAdminToken.count({ where: { createdAt: { gte: last24h } } }),
      db.platformAdminToken.count({ where: { createdAt: { gte: last7d } } }),
    ])

    const systemHealth = {
      dbStatus,
      uptime: {
        seconds: Math.round(uptimeSeconds),
        formatted: `${Math.floor(uptimeSeconds / 86400)}d ${Math.floor((uptimeSeconds % 86400) / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m`,
      },
      memoryUsage: {
        rss: Math.round((memUsage.rss / 1024 / 1024) * 100) / 100,
        heapTotal: Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100,
        heapUsed: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
        external: Math.round((memUsage.external / 1024 / 1024) * 100) / 100,
      },
      activeUsersLast24h,
      activeUsersLast7d,
    }

    // ══════════════════════════════════════════════════
    // NEW: License Warnings (expiring counts)
    // ══════════════════════════════════════════════════
    const addDays = (days: number) => {
      const d = new Date()
      d.setDate(d.getDate() + days)
      return d
    }

    const [expiring1Day, expiring3Days, expiring7Days, expiring14Days, expiring30Days] = await Promise.all([
      db.license.count({ where: { status: 'active', isLifetime: false, expiresAt: { gt: now, lte: addDays(1) } } }),
      db.license.count({ where: { status: 'active', isLifetime: false, expiresAt: { gt: now, lte: addDays(3) } } }),
      db.license.count({ where: { status: 'active', isLifetime: false, expiresAt: { gt: now, lte: addDays(7) } } }),
      db.license.count({ where: { status: 'active', isLifetime: false, expiresAt: { gt: now, lte: addDays(14) } } }),
      db.license.count({ where: { status: 'active', isLifetime: false, expiresAt: { gt: now, lte: addDays(30) } } }),
    ])

    const licenseWarnings = {
      expiring1Day,
      expiring3Days,
      expiring7Days,
      expiring14Days,
      expiring30Days,
    }

    // ══════════════════════════════════════════════════
    // NEW: Churn Rate
    // ══════════════════════════════════════════════════
    const cancelledTenants = await db.tenant.count({ where: { status: 'cancelled' } })
    const churnRate = totalTenants > 0
      ? Math.round((cancelledTenants / totalTenants) * 10000) / 100
      : 0

    // ══════════════════════════════════════════════════
    // NEW: Average Revenue Per User (ARPU)
    // ══════════════════════════════════════════════════
    const activePaidTenants = await db.tenant.count({
      where: {
        status: 'active',
        licenses: {
          some: {
            status: 'active',
            type: { in: ['basic', 'professional', 'enterprise', 'lifetime'] },
          },
        },
      },
    })
    const averageRevenuePerUser = activePaidTenants > 0
      ? Math.round(((totalRevenueFromRecords._sum.amount || 0) / activePaidTenants) * 100) / 100
      : 0

    // ══════════════════════════════════════════════════
    // NEW: Today Stats
    // ══════════════════════════════════════════════════
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [newTenantsToday, revenueToday, newLicensesToday] = await Promise.all([
      db.tenant.count({ where: { createdAt: { gte: todayStart } } }),
      db.revenueRecord.aggregate({
        where: { createdAt: { gte: todayStart } },
        _sum: { amount: true },
      }),
      db.license.count({ where: { createdAt: { gte: todayStart } } }),
    ])

    const todayStats = {
      newTenants: newTenantsToday,
      revenue: revenueToday._sum.amount || 0,
      newLicenses: newLicensesToday,
    }

    return NextResponse.json({
      stats: {
        totalTenants,
        activeTenants,
        trialTenants,
        expiredTenants,
        activePaidLicenses,
        lifetimeTenants,
        totalUsers,
        totalCompanies,
        totalInvoices,
        totalPurchaseInvoices,
        totalItems,
        totalCustomers,
        totalSuppliers,
        trialConversionRate,
      },
      revenue: {
        totalRevenue,
        monthlyRecurring,
        lifetimeRevenue,
        activePaidCount: allActiveLicenses.filter(l => l.price > 0).length,
        totalFromRecords: totalRevenueFromRecords._sum.amount || 0,
        thisMonth: revenueThisMonth._sum.amount || 0,
        lastMonth: revenueLastMonth._sum.amount || 0,
      },
      growth: {
        newTenantsThisMonth,
        newTenantsLastMonth,
        tenantGrowthPercent: newTenantsLastMonth > 0
          ? Math.round(((newTenantsThisMonth - newTenantsLastMonth) / newTenantsLastMonth) * 100)
          : newTenantsThisMonth > 0 ? 100 : 0,
        revenueGrowthPercent: (revenueLastMonth._sum.amount || 0) > 0
          ? Math.round((((revenueThisMonth._sum.amount || 0) - (revenueLastMonth._sum.amount || 0)) / (revenueLastMonth._sum.amount || 1)) * 100)
          : (revenueThisMonth._sum.amount || 0) > 0 ? 100 : 0,
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
        licenseDistribution: licenseDistribution.map((l) => ({
          type: l.type,
          count: l._count.type,
        })),
        licenseStatusDistribution: licenseStatusDistribution.map((l) => ({
          status: l.status,
          count: l._count.status,
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
      // ── NEW FIELDS ──
      systemHealth,
      licenseWarnings,
      churnRate,
      averageRevenuePerUser,
      todayStats,
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: message.includes('غير مصرح') ? 401 : 500 })
  }
}
