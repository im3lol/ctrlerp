import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-guard'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth(request)

    // ── Database connection check ──
    let dbStatus = 'connected'
    let dbResponseTime = 0
    try {
      const dbStart = Date.now()
      await db.$queryRaw`SELECT 1`
      dbResponseTime = Date.now() - dbStart
    } catch {
      dbStatus = 'disconnected'
    }

    // ── Record counts by model ──
    const [
      tenantCount,
      licenseCount,
      licenseHistoryCount,
      activityLogCount,
      revenueRecordCount,
      platformAdminCount,
      platformAdminTokenCount,
      userCount,
      companyCount,
      companyUserCount,
    ] = await Promise.all([
      db.tenant.count(),
      db.license.count(),
      db.licenseHistory.count(),
      db.activityLog.count(),
      db.revenueRecord.count(),
      db.platformAdmin.count(),
      db.platformAdminToken.count(),
      db.user.count(),
      db.company.count(),
      db.companyUser.count(),
    ])

    const recordCounts = {
      tenants: tenantCount,
      licenses: licenseCount,
      licenseHistories: licenseHistoryCount,
      activityLogs: activityLogCount,
      revenueRecords: revenueRecordCount,
      platformAdmins: platformAdminCount,
      platformAdminTokens: platformAdminTokenCount,
      users: userCount,
      companies: companyCount,
      companyUsers: companyUserCount,
    }

    // ── Active vs inactive users ──
    const activeUsers = await db.user.count({ where: { isActive: true } })
    const inactiveUsers = await db.user.count({ where: { isActive: false } })

    // ── Active vs expired licenses ──
    const activeLicenses = await db.license.count({ where: { status: 'active' } })
    const expiredLicenses = await db.license.count({ where: { status: 'expired' } })
    const suspendedLicenses = await db.license.count({ where: { status: 'suspended' } })
    const cancelledLicenses = await db.license.count({ where: { status: 'cancelled' } })

    // ── Recent logins (PlatformAdminToken records created recently) ──
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [recentLogins24h, recentLogins7d, recentLogins30d] = await Promise.all([
      db.platformAdminToken.count({ where: { createdAt: { gte: last24h } } }),
      db.platformAdminToken.count({ where: { createdAt: { gte: last7d } } }),
      db.platformAdminToken.count({ where: { createdAt: { gte: last30d } } }),
    ])

    // ── System uptime ──
    const uptimeSeconds = process.uptime()
    const days = Math.floor(uptimeSeconds / 86400)
    const hours = Math.floor((uptimeSeconds % 86400) / 3600)
    const minutes = Math.floor((uptimeSeconds % 3600) / 60)

    // ── Memory usage ──
    const memoryUsage = process.memoryUsage()
    const formatBytes = (bytes: number) => ({
      bytes,
      mb: Math.round((bytes / 1024 / 1024) * 100) / 100,
      formatted: `${(bytes / 1024 / 1024).toFixed(2)} MB`,
    })

    // ── License expiration warnings ──
    const addDays = (days: number) => {
      const d = new Date()
      d.setDate(d.getDate() + days)
      return d
    }

    const [
      expiring1Day,
      expiring3Days,
      expiring7Days,
      expiring14Days,
      expiring30Days,
    ] = await Promise.all([
      db.license.count({
        where: { status: 'active', isLifetime: false, expiresAt: { gt: now, lte: addDays(1) } },
      }),
      db.license.count({
        where: { status: 'active', isLifetime: false, expiresAt: { gt: now, lte: addDays(3) } },
      }),
      db.license.count({
        where: { status: 'active', isLifetime: false, expiresAt: { gt: now, lte: addDays(7) } },
      }),
      db.license.count({
        where: { status: 'active', isLifetime: false, expiresAt: { gt: now, lte: addDays(14) } },
      }),
      db.license.count({
        where: { status: 'active', isLifetime: false, expiresAt: { gt: now, lte: addDays(30) } },
      }),
    ])

    // ── Tenant status breakdown ──
    const tenantStatusBreakdown = await db.tenant.groupBy({
      by: ['status'],
      _count: { status: true },
    })

    // ── Average tenants per month (last 6 months) ──
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const tenantsLast6Months = await db.tenant.count({
      where: { createdAt: { gte: sixMonthsAgo } },
    })
    const averageTenantsPerMonth = Math.round((tenantsLast6Months / 6) * 100) / 100

    // ── Churn rate ──
    const cancelledTenants = await db.tenant.count({ where: { status: 'cancelled' } })
    const churnRate = tenantCount > 0
      ? Math.round((cancelledTenants / tenantCount) * 10000) / 100 // 2 decimal places
      : 0

    return NextResponse.json({
      database: {
        status: dbStatus,
        responseTimeMs: dbResponseTime,
        recordCounts,
      },
      users: {
        active: activeUsers,
        inactive: inactiveUsers,
        total: userCount,
      },
      licenses: {
        active: activeLicenses,
        expired: expiredLicenses,
        suspended: suspendedLicenses,
        cancelled: cancelledLicenses,
        total: licenseCount,
      },
      recentLogins: {
        last24h: recentLogins24h,
        last7d: recentLogins7d,
        last30d: recentLogins30d,
      },
      system: {
        uptime: {
          seconds: Math.round(uptimeSeconds),
          formatted: `${days}d ${hours}h ${minutes}m`,
          days,
          hours,
          minutes,
        },
        memory: {
          rss: formatBytes(memoryUsage.rss),
          heapTotal: formatBytes(memoryUsage.heapTotal),
          heapUsed: formatBytes(memoryUsage.heapUsed),
          external: formatBytes(memoryUsage.external),
          arrayBuffers: formatBytes(memoryUsage.arrayBuffers),
        },
      },
      licenseWarnings: {
        expiring1Day,
        expiring3Days,
        expiring7Days,
        expiring14Days,
        expiring30Days,
      },
      tenants: {
        statusBreakdown: tenantStatusBreakdown.map(t => ({
          status: t.status,
          count: t._count.status,
        })),
        averageTenantsPerMonth,
        churnRate,
        cancelledTenants,
        totalTenants: tenantCount,
      },
    })
  } catch (error) {
    console.error('System health error:', error)
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    return NextResponse.json(
      { error: message },
      { status: message.includes('غير مصرح') ? 401 : 500 }
    )
  }
}
