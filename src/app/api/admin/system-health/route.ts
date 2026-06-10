import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-guard'
import { cached, CACHE_TTL } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth(request)

    const data = await cached('admin:system-health', CACHE_TTL.SYSTEM_HEALTH, () => computeSystemHealth())

    return NextResponse.json(data)
  } catch (error) {
    console.error('System health error:', error)
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    return NextResponse.json(
      { error: message },
      { status: message.includes('غير مصرح') ? 401 : 500 }
    )
  }
}

async function computeSystemHealth() {
  const now = new Date()
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  // ══════════════════════════════════════════════════
  // PHASE 1: Parallel independent queries (4 queries instead of 20+)
  // ══════════════════════════════════════════════════
  const [
    dbHealthCheck,
    allCounts,
    licenseExpirationData,
    loginStats,
  ] = await Promise.all([
    // 1. DB health check
    (async () => {
      try {
        const start = Date.now()
        await db.$queryRaw`SELECT 1`
        return { status: 'connected', responseTimeMs: Date.now() - start }
      } catch {
        return { status: 'disconnected', responseTimeMs: 0 }
      }
    })(),

    // 2. ALL record counts in ONE query instead of 10 separate count queries
    db.$queryRaw<
      { tenants: bigint; licenses: bigint; license_histories: bigint; activity_logs: bigint; revenue_records: bigint; platform_admins: bigint; platform_admin_tokens: bigint; users: bigint; active_users: bigint; inactive_users: bigint; companies: bigint; company_users: bigint; active_licenses: bigint; expired_licenses: bigint; suspended_licenses: bigint; cancelled_licenses: bigint; cancelled_tenants: bigint; tenants_last_6m: bigint }
    >`
      SELECT
        (SELECT COUNT(*) FROM "Tenant") as tenants,
        (SELECT COUNT(*) FROM "License") as licenses,
        (SELECT COUNT(*) FROM "LicenseHistory") as license_histories,
        (SELECT COUNT(*) FROM "ActivityLog") as activity_logs,
        (SELECT COUNT(*) FROM "RevenueRecord") as revenue_records,
        (SELECT COUNT(*) FROM "PlatformAdmin") as platform_admins,
        (SELECT COUNT(*) FROM "PlatformAdminToken") as platform_admin_tokens,
        (SELECT COUNT(*) FROM "User") as users,
        (SELECT COUNT(*) FROM "User" WHERE "isActive" = true) as active_users,
        (SELECT COUNT(*) FROM "User" WHERE "isActive" = false) as inactive_users,
        (SELECT COUNT(*) FROM "Company") as companies,
        (SELECT COUNT(*) FROM "CompanyUser") as company_users,
        (SELECT COUNT(*) FROM "License" WHERE status = 'active') as active_licenses,
        (SELECT COUNT(*) FROM "License" WHERE status = 'expired') as expired_licenses,
        (SELECT COUNT(*) FROM "License" WHERE status = 'suspended') as suspended_licenses,
        (SELECT COUNT(*) FROM "License" WHERE status = 'cancelled') as cancelled_licenses,
        (SELECT COUNT(*) FROM "Tenant" WHERE status = 'cancelled') as cancelled_tenants,
        (SELECT COUNT(*) FROM "Tenant" WHERE "createdAt" >= NOW() - interval '6 months') as tenants_last_6m
    `,

    // 3. License expiration warnings - SINGLE query instead of 5 separate
    db.$queryRaw<
      { expiring_1d: bigint; expiring_3d: bigint; expiring_7d: bigint; expiring_14d: bigint; expiring_30d: bigint }
    >`
      SELECT
        (SELECT COUNT(*) FROM "License" WHERE status = 'active' AND "isLifetime" = false AND "expiresAt" > NOW() AND "expiresAt" <= NOW() + interval '1 day') as expiring_1d,
        (SELECT COUNT(*) FROM "License" WHERE status = 'active' AND "isLifetime" = false AND "expiresAt" > NOW() AND "expiresAt" <= NOW() + interval '3 days') as expiring_3d,
        (SELECT COUNT(*) FROM "License" WHERE status = 'active' AND "isLifetime" = false AND "expiresAt" > NOW() AND "expiresAt" <= NOW() + interval '7 days') as expiring_7d,
        (SELECT COUNT(*) FROM "License" WHERE status = 'active' AND "isLifetime" = false AND "expiresAt" > NOW() AND "expiresAt" <= NOW() + interval '14 days') as expiring_14d,
        (SELECT COUNT(*) FROM "License" WHERE status = 'active' AND "isLifetime" = false AND "expiresAt" > NOW() AND "expiresAt" <= NOW() + interval '30 days') as expiring_30d
    `,

    // 4. Login stats + tenant status in ONE query
    db.$queryRaw<
      { logins_24h: bigint; logins_7d: bigint; logins_30d: bigint; active_tenants: bigint; suspended_tenants: bigint; cancelled_tenants: bigint }
    >`
      SELECT
        (SELECT COUNT(*) FROM "PlatformAdminToken" WHERE "createdAt" >= NOW() - interval '1 day') as logins_24h,
        (SELECT COUNT(*) FROM "PlatformAdminToken" WHERE "createdAt" >= NOW() - interval '7 days') as logins_7d,
        (SELECT COUNT(*) FROM "PlatformAdminToken" WHERE "createdAt" >= NOW() - interval '30 days') as logins_30d,
        (SELECT COUNT(*) FROM "Tenant" WHERE status = 'active') as active_tenants,
        (SELECT COUNT(*) FROM "Tenant" WHERE status = 'suspended') as suspended_tenants,
        (SELECT COUNT(*) FROM "Tenant" WHERE status = 'cancelled') as cancelled_tenants
    `,
  ])

  // ══════════════════════════════════════════════════
  // COMPUTE: Derive all values from collected data
  // ══════════════════════════════════════════════════
  const c = allCounts[0]
  const ls = licenseExpirationData[0]
  const lg = loginStats[0]

  const tenantCount = Number(c.tenants)
  const cancelledTenantsCount = Number(c.cancelled_tenants)
  const tenantsLast6Months = Number(c.tenants_last_6m)
  const averageTenantsPerMonth = Math.round((tenantsLast6Months / 6) * 100) / 100
  const churnRate = tenantCount > 0
    ? Math.round((cancelledTenantsCount / tenantCount) * 10000) / 100
    : 0

  // System uptime & memory
  const uptimeSeconds = process.uptime()
  const days = Math.floor(uptimeSeconds / 86400)
  const hours = Math.floor((uptimeSeconds % 86400) / 3600)
  const minutes = Math.floor((uptimeSeconds % 3600) / 60)
  const memoryUsage = process.memoryUsage()
  const formatBytes = (bytes: number) => ({
    bytes,
    mb: Math.round((bytes / 1024 / 1024) * 100) / 100,
    formatted: `${(bytes / 1024 / 1024).toFixed(2)} MB`,
  })

  return {
    database: {
      status: dbHealthCheck.status,
      responseTimeMs: dbHealthCheck.responseTimeMs,
      recordCounts: {
        tenants: tenantCount,
        licenses: Number(c.licenses),
        licenseHistories: Number(c.license_histories),
        activityLogs: Number(c.activity_logs),
        revenueRecords: Number(c.revenue_records),
        platformAdmins: Number(c.platform_admins),
        platformAdminTokens: Number(c.platform_admin_tokens),
        users: Number(c.users),
        companies: Number(c.companies),
        companyUsers: Number(c.company_users),
      },
    },
    users: {
      active: Number(c.active_users),
      inactive: Number(c.inactive_users),
      total: Number(c.users),
    },
    licenses: {
      active: Number(c.active_licenses),
      expired: Number(c.expired_licenses),
      suspended: Number(c.suspended_licenses),
      cancelled: Number(c.cancelled_licenses),
      total: Number(c.licenses),
    },
    recentLogins: {
      last24h: Number(lg.logins_24h),
      last7d: Number(lg.logins_7d),
      last30d: Number(lg.logins_30d),
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
      expiring1Day: Number(ls.expiring_1d),
      expiring3Days: Number(ls.expiring_3d),
      expiring7Days: Number(ls.expiring_7d),
      expiring14Days: Number(ls.expiring_14d),
      expiring30Days: Number(ls.expiring_30d),
    },
    tenants: {
      statusBreakdown: [
        { status: 'active', count: Number(lg.active_tenants) },
        { status: 'suspended', count: Number(lg.suspended_tenants) },
        { status: 'cancelled', count: Number(lg.cancelled_tenants) },
      ],
      averageTenantsPerMonth,
      churnRate,
      cancelledTenants: cancelledTenantsCount,
      totalTenants: tenantCount,
    },
  }
}
