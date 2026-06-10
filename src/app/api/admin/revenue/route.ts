import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-guard'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth(request)

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '1y' // 1m, 3m, 6m, 1y, all
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const currency = searchParams.get('currency') || ''
    const type = searchParams.get('type') || ''
    const skip = (page - 1) * limit

    const monthsMap: Record<string, number> = {
      '1m': 1,
      '3m': 3,
      '6m': 6,
      '1y': 12,
      'all': 36,
    }

    const monthsCount = monthsMap[period] || 12
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - monthsCount)

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    // ── Monthly revenue breakdown ──
    const revenueRecords = await db.revenueRecord.findMany({
      where: { createdAt: { gte: startDate } },
      orderBy: { createdAt: 'asc' },
    })

    const revenueByMonth: Record<string, { subscription: number; renewal: number; upgrade: number; lifetime: number; trial_extension: number; other: number; total: number }> = {}

    // Initialize all months
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

    const monthlyBreakdown = Object.entries(revenueByMonth).map(([month, data]) => ({
      month,
      ...data,
    }))

    // ── Revenue by license type ──
    const revenueByLicenseTypeRaw = await db.revenueRecord.groupBy({
      by: ['licenseId'],
      _sum: { amount: true },
      _count: { id: true },
    })

    const licenseIds = revenueByLicenseTypeRaw.map(r => r.licenseId)
    const licenseDetails = await db.license.findMany({
      where: { id: { in: licenseIds } },
      select: { id: true, type: true },
    })

    const revenueByType: Record<string, { amount: number; count: number }> = {
      trial: { amount: 0, count: 0 },
      basic: { amount: 0, count: 0 },
      professional: { amount: 0, count: 0 },
      enterprise: { amount: 0, count: 0 },
      lifetime: { amount: 0, count: 0 },
    }

    revenueByLicenseTypeRaw.forEach(r => {
      const license = licenseDetails.find(l => l.id === r.licenseId)
      const lType = license?.type || 'basic'
      if (!revenueByType[lType]) {
        revenueByType[lType] = { amount: 0, count: 0 }
      }
      revenueByType[lType].amount += r._sum.amount || 0
      revenueByType[lType].count += r._count.id
    })

    // ── Revenue by currency ──
    const revenueByCurrency = await db.revenueRecord.groupBy({
      by: ['currency'],
      _sum: { amount: true },
      _count: { id: true },
    })

    // ── MRR trend over months ──
    // For each month, calculate the MRR based on active monthly subscriptions at that time
    const mrrTrend: { month: string; mrr: number }[] = []
    for (let i = monthsCount; i >= 0; i--) {
      const monthDate = new Date()
      monthDate.setMonth(monthDate.getMonth() - i)

      // Get active licenses that were active during this month
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59)

      const activeLicensesInMonth = await db.license.findMany({
        where: {
          status: 'active',
          isLifetime: false,
          type: { not: 'trial' },
          monthlyPrice: { gt: 0 },
          startedAt: { lte: monthEnd },
          expiresAt: { gte: monthStart },
        },
        select: { monthlyPrice: true, currency: true },
      })

      const mrr = activeLicensesInMonth
        .reduce((sum, l) => sum + l.monthlyPrice, 0)

      const key = `${months[monthDate.getMonth()]} ${monthDate.getFullYear()}`
      mrrTrend.push({ month: key, mrr })
    }

    // ── Current MRR & ARR ──
    const currentActiveMonthlyLicenses = await db.license.findMany({
      where: {
        status: 'active',
        isLifetime: false,
        type: { not: 'trial' },
        monthlyPrice: { gt: 0 },
        expiresAt: { gte: new Date() },
      },
      select: { monthlyPrice: true, currency: true },
    })

    const currentMRR = currentActiveMonthlyLicenses
      .reduce((sum, l) => sum + l.monthlyPrice, 0)

    const arr = currentMRR * 12

    // ── ARPU (Average Revenue Per User) ──
    const totalRevenueFromRecords = await db.revenueRecord.aggregate({
      _sum: { amount: true },
    })

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

    const totalRevenue = totalRevenueFromRecords._sum.amount || 0
    const arpu = activePaidTenants > 0
      ? Math.round((totalRevenue / activePaidTenants) * 100) / 100
      : 0

    // ── LTV (Lifetime Value) estimate ──
    // LTV = ARPU * average customer lifespan
    // Average lifespan estimated from: total active months / total tenants
    const allLicenses = await db.license.findMany({
      where: { type: { not: 'trial' } },
      select: { startedAt: true, expiresAt: true, isLifetime: true },
    })

    let totalActiveMonths = 0
    let validLicenseCount = 0

    allLicenses.forEach(l => {
      if (l.isLifetime) {
        // Count lifetime as 36 months (3 years) for LTV estimation
        totalActiveMonths += 36
        validLicenseCount++
      } else {
        const months = (new Date(l.expiresAt).getTime() - new Date(l.startedAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
        if (months > 0) {
          totalActiveMonths += months
          validLicenseCount++
        }
      }
    })

    const avgLifespanMonths = validLicenseCount > 0
      ? Math.round((totalActiveMonths / validLicenseCount) * 100) / 100
      : 12

    const ltv = Math.round(arpu * avgLifespanMonths * 100) / 100

    // ── Revenue records with pagination and filtering ──
    const where: Record<string, unknown> = {}
    if (currency) (where as Record<string, unknown>).currency = currency
    if (type) (where as Record<string, unknown>).type = type

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

    // ── Top tenants by revenue ──
    const topTenantsRaw = await db.revenueRecord.groupBy({
      by: ['tenantId'],
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 20,
    })

    const topTenantIds = topTenantsRaw.map(t => t.tenantId)
    const topTenantDetails = await db.tenant.findMany({
      where: { id: { in: topTenantIds } },
      select: { id: true, name: true, email: true, status: true },
    })

    const topTenants = topTenantsRaw.map(tt => {
      const details = topTenantDetails.find(t => t.id === tt.tenantId)
      return {
        tenantId: tt.tenantId,
        name: details?.name || 'Unknown',
        email: details?.email || null,
        status: details?.status || 'unknown',
        totalRevenue: tt._sum.amount || 0,
        recordCount: tt._count.id,
      }
    })

    // ── Revenue forecast (simple linear projection based on last 3 months) ──
    const last3MonthsRevenue: { month: string; amount: number }[] = []
    for (let i = 2; i >= 0; i--) {
      const monthStart = new Date()
      monthStart.setMonth(monthStart.getMonth() - i)
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)

      const monthRevenue = await db.revenueRecord.aggregate({
        where: { createdAt: { gte: monthStart, lt: monthEnd } },
        _sum: { amount: true },
      })

      last3MonthsRevenue.push({
        month: `${months[monthStart.getMonth()]} ${monthStart.getFullYear()}`,
        amount: monthRevenue._sum.amount || 0,
      })
    }

    // Calculate linear regression for forecast
    const xVals = [0, 1, 2]
    const yVals = last3MonthsRevenue.map(m => m.amount)
    const n = 3
    const sumX = xVals.reduce((a, b) => a + b, 0)
    const sumY = yVals.reduce((a, b) => a + b, 0)
    const sumXY = xVals.reduce((sum, x, i) => sum + x * yVals[i], 0)
    const sumX2 = xVals.reduce((sum, x) => sum + x * x, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0
    const intercept = (sumY - slope * sumX) / n

    // Forecast next 3 months
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

    // ── Revenue by record type ──
    const revenueByRecordType = await db.revenueRecord.groupBy({
      by: ['type'],
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
    })

    return NextResponse.json({
      summary: {
        totalRevenue,
        currentMRR,
        arr,
        arpu,
        ltv,
        avgLifespanMonths,
        activePaidTenants,
        totalRecords: totalRecords,
      },
      monthlyBreakdown,
      revenueByLicenseType: Object.entries(revenueByType).map(([type, data]) => ({
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
        basedOn: last3MonthsRevenue,
        projected: forecast,
      },
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
