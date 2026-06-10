import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-guard'
import { cached, CACHE_TTL } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth(request)

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '1y'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const currency = searchParams.get('currency') || ''
    const type = searchParams.get('type') || ''
    const skip = (page - 1) * limit

    const monthsMap: Record<string, number> = {
      '1m': 1, '3m': 3, '6m': 6, '1y': 12, 'all': 36,
    }
    const monthsCount = monthsMap[period] || 12
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    // Use cache key based on period for aggregated data
    const cacheKey = `admin:revenue:${period}`
    const data = await cached(cacheKey, CACHE_TTL.REVENUE, () =>
      computeRevenueData(monthsCount, months)
    )

    // Paginated records are NOT cached (they change frequently with pagination)
    const where: Record<string, unknown> = {}
    if (currency) where.currency = currency
    if (type) where.type = type

    const [records, totalRecords] = await Promise.all([
      db.revenueRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { id: true, name: true, email: true } },
          license: { select: { id: true, type: true, key: true } },
        },
      }),
      db.revenueRecord.count({ where }),
    ])

    return NextResponse.json({
      ...data,
      records: {
        data: records.map(r => ({
          id: r.id,
          amount: r.amount,
          currency: r.currency,
          type: r.type,
          periodStart: r.periodStart,
          periodEnd: r.periodEnd,
          description: r.description,
          createdAt: r.createdAt,
          tenant: r.tenant,
          license: r.license,
        })),
        total: totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
      },
    })
  } catch (error) {
    console.error('Revenue API error:', error)
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    return NextResponse.json(
      { error: message },
      { status: message.includes('غير مصرح') ? 401 : 500 }
    )
  }
}

async function computeRevenueData(monthsCount: number, months: string[]) {
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - monthsCount)

  // ══════════════════════════════════════════════════
  // ALL independent queries in parallel
  // ══════════════════════════════════════════════════
  const [
    revenueRecords,
    licenseTypeDistribution,
    topTenantsByRevenue,
    revenueByCurrency,
    revenueByRecordType,
    currentMRRData,
    mrrTrendRaw,
    activePaidTenants,
    ltvStats,
  ] = await Promise.all([
    // 1. Revenue records for period (only select needed fields)
    db.revenueRecord.findMany({
      where: { createdAt: { gte: startDate } },
      select: { amount: true, type: true, licenseId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),

    // 2. License distribution with revenue
    db.license.groupBy({
      by: ['type'],
      _count: { id: true },
      _sum: { price: true, monthlyPrice: true },
    }),

    // 3. Top tenants by revenue
    db.revenueRecord.groupBy({
      by: ['tenantId'],
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 20,
    }),

    // 4. Revenue by currency
    db.revenueRecord.groupBy({
      by: ['currency'],
      _sum: { amount: true },
      _count: { id: true },
    }),

    // 5. Revenue by record type
    db.revenueRecord.groupBy({
      by: ['type'],
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
    }),

    // 6. Current MRR
    db.license.findMany({
      where: {
        status: 'active',
        isLifetime: false,
        type: { not: 'trial' },
        monthlyPrice: { gt: 0 },
        expiresAt: { gte: new Date() },
      },
      select: { monthlyPrice: true, currency: true },
    }),

    // 7. MRR trend - use raw SQL
    db.$queryRaw<
      { month: Date; mrr: number }[]
    >`
      SELECT 
        DATE_TRUNC('month', d.dt) as month,
        COALESCE(SUM(l."monthlyPrice"), 0) as mrr
      FROM generate_series(
        DATE_TRUNC('month', NOW() - interval '${monthsCount} months'),
        DATE_TRUNC('month', NOW()),
        interval '1 month'
      ) d(dt)
      LEFT JOIN "License" l ON 
        l.status = 'active' 
        AND l."isLifetime" = false 
        AND l.type != 'trial' 
        AND l."monthlyPrice" > 0
        AND l."startedAt" <= (d.dt + interval '1 month' - interval '1 second')
        AND l."expiresAt" >= d.dt
      GROUP BY DATE_TRUNC('month', d.dt)
      ORDER BY month ASC
    `,

    // 8. Active paid tenants count (was sequential before - now parallel)
    db.tenant.count({
      where: {
        status: 'active',
        licenses: { some: { status: 'active', type: { in: ['basic', 'professional', 'enterprise', 'lifetime'] } } },
      },
    }),

    // 9. LTV stats using raw SQL aggregate (instead of fetching ALL licenses into memory)
    db.$queryRaw<
      { avg_lifespan_months: number }[]
    >`
      SELECT 
        COALESCE(AVG(
          CASE 
            WHEN "isLifetime" = true THEN 36
            ELSE EXTRACT(EPOCH FROM ("expiresAt" - "startedAt")) / (30 * 24 * 3600)
          END
        ), 12) as avg_lifespan_months
      FROM "License"
      WHERE type != 'trial'
        AND (
          "isLifetime" = true 
          OR "expiresAt" > "startedAt"
        )
    `,
  ])

  // ══════════════════════════════════════════════════
  // Dependent query: tenant details
  // ══════════════════════════════════════════════════
  const tenantIds = topTenantsByRevenue.map(t => t.tenantId)
  const tenantDetails = tenantIds.length > 0
    ? await db.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true, name: true, email: true, status: true },
      })
    : []

  // Also get license details for revenue breakdown
  const licenseIdsForRevenue = [...new Set(revenueRecords.map(r => r.licenseId))]
  const licenseDetails = licenseIdsForRevenue.length > 0
    ? await db.license.findMany({
        where: { id: { in: licenseIdsForRevenue } },
        select: { id: true, type: true },
      })
    : []

  // ══════════════════════════════════════════════════
  // COMPUTE
  // ══════════════════════════════════════════════════

  const revenueByMonth: Record<string, { subscription: number; renewal: number; upgrade: number; lifetime: number; trial_extension: number; other: number; total: number }> = {}
  for (let i = monthsCount; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${months[d.getMonth()]} ${d.getFullYear()}`
    revenueByMonth[key] = { subscription: 0, renewal: 0, upgrade: 0, lifetime: 0, trial_extension: 0, other: 0, total: 0 }
  }
  revenueRecords.forEach(r => {
    const d = new Date(r.createdAt)
    const key = `${months[d.getMonth()]} ${d.getFullYear()}`
    if (key in revenueByMonth) {
      revenueByMonth[key].total += r.amount
      if (r.type === 'subscription') revenueByMonth[key].subscription += r.amount
      else if (r.type === 'renewal') revenueByMonth[key].renewal += r.amount
      else if (r.type === 'upgrade') revenueByMonth[key].upgrade += r.amount
      else if (r.type === 'lifetime') revenueByMonth[key].lifetime += r.amount
      else if (r.type === 'trial_extension') revenueByMonth[key].trial_extension += r.amount
      else revenueByMonth[key].other += r.amount
    }
  })
  const monthlyBreakdown = Object.entries(revenueByMonth).map(([month, data]) => ({ month, ...data }))

  const revenueByLicenseTypeRaw: Record<string, { amount: number; count: number }> = {
    trial: { amount: 0, count: 0 }, basic: { amount: 0, count: 0 },
    professional: { amount: 0, count: 0 }, enterprise: { amount: 0, count: 0 },
    lifetime: { amount: 0, count: 0 },
  }
  revenueRecords.forEach(r => {
    const license = licenseDetails.find(l => l.id === r.licenseId)
    const lType = license?.type || 'basic'
    if (!revenueByLicenseTypeRaw[lType]) revenueByLicenseTypeRaw[lType] = { amount: 0, count: 0 }
    revenueByLicenseTypeRaw[lType].amount += r.amount
    revenueByLicenseTypeRaw[lType].count++
  })

  const mrrTrend = mrrTrendRaw.map(r => ({
    month: `${months[new Date(r.month).getMonth()]} ${new Date(r.month).getFullYear()}`,
    mrr: Number(r.mrr),
  }))

  const currentMRR = currentMRRData
    .filter(l => l.currency === 'EGP')
    .reduce((sum, l) => sum + l.monthlyPrice, 0)
  const arr = currentMRR * 12

  const totalRevenue = revenueByCurrency.reduce((s, rc) => s + (rc._sum.amount || 0), 0)

  const arpu = activePaidTenants > 0
    ? Math.round((totalRevenue / activePaidTenants) * 100) / 100
    : 0

  // LTV from SQL aggregate (no more fetching all licenses into memory)
  const avgLifespanMonths = Math.round((ltvStats[0]?.avg_lifespan_months || 12) * 100) / 100
  const ltv = Math.round(arpu * avgLifespanMonths * 100) / 100

  const topTenants = topTenantsByRevenue.map(tt => {
    const details = tenantDetails.find(t => t.id === tt.tenantId)
    return {
      tenantId: tt.tenantId,
      name: details?.name || 'Unknown',
      email: details?.email || null,
      status: details?.status || 'unknown',
      totalRevenue: tt._sum.amount || 0,
      recordCount: tt._count.id,
    }
  })

  // Revenue forecast (simple linear projection based on last 3 months)
  const last3Months: { month: string; amount: number }[] = []
  for (let i = 2; i >= 0; i--) {
    const monthStart = new Date()
    monthStart.setMonth(monthStart.getMonth() - i)
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const monthEnd = new Date(monthStart)
    monthEnd.setMonth(monthEnd.getMonth() + 1)

    const monthAmount = revenueRecords
      .filter(r => new Date(r.createdAt) >= monthStart && new Date(r.createdAt) < monthEnd)
      .reduce((s, r) => s + r.amount, 0)

    last3Months.push({
      month: `${months[monthStart.getMonth()]} ${monthStart.getFullYear()}`,
      amount: monthAmount,
    })
  }

  const xVals = [0, 1, 2]
  const yVals = last3Months.map(m => m.amount)
  const n = 3
  const sumX = xVals.reduce((a, b) => a + b, 0)
  const sumY = yVals.reduce((a, b) => a + b, 0)
  const sumXY = xVals.reduce((sum, x, i) => sum + x * yVals[i], 0)
  const sumX2 = xVals.reduce((sum, x) => sum + x * x, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0
  const intercept = (sumY - slope * sumX) / n

  const forecast: { month: string; projectedAmount: number }[] = []
  for (let i = 1; i <= 3; i++) {
    const projectedAmount = Math.max(0, Math.round((intercept + slope * (2 + i)) * 100) / 100)
    const futureDate = new Date()
    futureDate.setMonth(futureDate.getMonth() + i)
    forecast.push({
      month: `${months[futureDate.getMonth()]} ${futureDate.getFullYear()}`,
      projectedAmount,
    })
  }

  return {
    summary: {
      totalRevenue,
      currentMRR,
      arr,
      arpu,
      ltv,
      avgLifespanMonths,
      activePaidTenants,
    },
    monthlyBreakdown,
    revenueByLicenseType: Object.entries(revenueByLicenseTypeRaw).map(([type, data]) => ({
      type,
      amount: data.amount,
      count: data.count,
    })),
    revenueByCurrency: revenueByCurrency.map(rc => ({
      currency: rc.currency,
      amount: rc._sum.amount || 0,
      count: rc._count.id,
    })),
    revenueByRecordType: revenueByRecordType.map(rt => ({
      type: rt.type,
      amount: rt._sum.amount || 0,
      count: rt._count.id,
    })),
    mrrTrend,
    topTenants,
    forecast: {
      basedOn: last3Months,
      projected: forecast,
    },
  }
}
