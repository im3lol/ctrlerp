import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/admin-guard'
import { db } from '@/lib/db'
import { exportToCSV, exportToJSON, getDateRange, formatNumber } from '@/lib/export-utils'

// GET: Generate reports with optional export
export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request)
    if (!admin) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'revenue'
    const period = searchParams.get('period') || 'this_month'
    const format = searchParams.get('format') || 'json' // json or csv
    const { start, end } = getDateRange(period)

    let data: any = {}

    switch (reportType) {
      case 'revenue': {
        // Revenue by month
        const revenueRecords = await db.revenueRecord.findMany({
          where: { createdAt: { gte: start, lte: end } },
          include: { tenant: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        })

        data = {
          total: revenueRecords.reduce((sum, r) => sum + r.amount, 0),
          count: revenueRecords.length,
          records: revenueRecords.map(r => ({
            date: r.createdAt.toISOString().split('T')[0],
            tenant: r.tenant.name,
            amount: r.amount,
            currency: r.currency,
            type: r.type,
          })),
        }
        break
      }

      case 'licenses': {
        // License distribution
        const licenses = await db.license.findMany({
          where: { createdAt: { gte: start, lte: end } },
          include: { tenant: { select: { name: true } } },
        })

        const byType = licenses.reduce((acc, l) => {
          acc[l.type] = (acc[l.type] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        const byStatus = licenses.reduce((acc, l) => {
          acc[l.status] = (acc[l.status] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        data = {
          total: licenses.length,
          byType,
          byStatus,
          totalRevenue: licenses.reduce((sum, l) => sum + l.price, 0),
          mrr: licenses.filter(l => l.status === 'active' && !l.isLifetime).reduce((sum, l) => sum + l.monthlyPrice, 0),
          records: licenses.map(l => ({
            tenant: l.tenant.name,
            type: l.type,
            status: l.status,
            price: l.price,
            monthlyPrice: l.monthlyPrice,
            isLifetime: l.isLifetime,
            expiresAt: l.expiresAt.toISOString().split('T')[0],
            createdAt: l.createdAt.toISOString().split('T')[0],
          })),
        }
        break
      }

      case 'tenants': {
        // Tenant growth
        const tenants = await db.tenant.findMany({
          where: { createdAt: { gte: start, lte: end } },
          include: {
            _count: { select: { licenses: true, companies: true } },
          },
        })

        const byStatus = tenants.reduce((acc, t) => {
          acc[t.status] = (acc[t.status] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        const byPlan = tenants.reduce((acc, t) => {
          acc[t.planType] = (acc[t.planType] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        data = {
          total: tenants.length,
          byStatus,
          byPlan,
          records: tenants.map(t => ({
            name: t.name,
            status: t.status,
            planType: t.planType,
            licenses: t._count.licenses,
            companies: t._count.companies,
            createdAt: t.createdAt.toISOString().split('T')[0],
          })),
        }
        break
      }

      default:
        return NextResponse.json({ error: 'نوع التقرير غير صالح' }, { status: 400 })
    }

    // Export if requested
    if (format === 'csv' && data.records) {
      const filename = `${reportType}_report_${new Date().toISOString().split('T')[0]}`
      return exportToCSV(data.records, filename)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Report error:', error)
    return NextResponse.json({ error: 'فشل إنشاء التقرير' }, { status: 500 })
  }
}
