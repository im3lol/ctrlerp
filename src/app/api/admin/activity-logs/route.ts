import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-guard'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth(request)

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || ''
    const action = searchParams.get('action') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '30')
    const skip = (page - 1) * limit

    const where: any = {}
    if (category) where.category = category
    if (action) where.action = { contains: action, mode: 'insensitive' }

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
    })
  } catch (error) {
    console.error('Activity logs error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: message.includes('غير مصرح') ? 401 : 500 })
  }
}
