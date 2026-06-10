import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-guard'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth(request)

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || ''
    const action = searchParams.get('action') || ''
    const search = searchParams.get('search') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '30')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (action) where.action = { contains: action, mode: 'insensitive' }
    if (search) {
      where.description = { contains: search, mode: 'insensitive' }
    }

    // Date range filter
    if (startDate || endDate) {
      const createdAtFilter: Record<string, Date> = {}
      if (startDate) {
        const start = new Date(startDate)
        if (!isNaN(start.getTime())) {
          createdAtFilter.gte = start
        }
      }
      if (endDate) {
        const end = new Date(endDate)
        if (!isNaN(end.getTime())) {
          // Set to end of day
          end.setHours(23, 59, 59, 999)
          createdAtFilter.lte = end
        }
      }
      if (Object.keys(createdAtFilter).length > 0) {
        where.createdAt = createdAtFilter
      }
    }

    const [logs, total] = await Promise.all([
      db.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.activityLog.count({ where }),
    ])

    // Get category counts for filters
    const categoryCounts = await db.activityLog.groupBy({
      by: ['category'],
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
    })

    // Get action type counts for filter sidebar
    const actionCounts = await db.activityLog.groupBy({
      by: ['action'],
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
      take: 50,
    })

    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      categoryCounts: categoryCounts.map(c => ({
        category: c.category,
        count: c._count.category,
      })),
      actionCounts: actionCounts.map(a => ({
        action: a.action,
        count: a._count.action,
      })),
    })
  } catch (error) {
    console.error('Activity logs error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: message.includes('غير مصرح') ? 401 : 500 })
  }
}
