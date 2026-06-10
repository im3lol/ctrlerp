import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { cached, CACHE_TTL } from '@/lib/cache'

// GET /api/dashboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    // Cache dashboard data per company for 15 seconds
    const cacheKey = `user:dashboard:${companyId}`
    const data = await cached(cacheKey, 15_000, () => computeUserDashboard(companyId))

    return NextResponse.json(data)
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'فشل في تحميل لوحة التحكم' }, { status: 500 })
  }
}

async function computeUserDashboard(companyId: string) {
  // ══════════════════════════════════════════════════
  // ALL queries in parallel using aggregates instead of findMany
  // ══════════════════════════════════════════════════
  const [
    salesAgg,
    purchaseAgg,
    customerCount,
    supplierCount,
    inventoryValueResult,
    dueInvoicesCount,
    recentActivities,
  ] = await Promise.all([
    // 1. Total confirmed/posted sales (aggregate instead of findMany)
    db.salesInvoice.aggregate({
      where: { companyId, status: { in: ['CONFIRMED', 'POSTED', 'PAID', 'PARTIAL_PAID'] } },
      _sum: { totalAmount: true },
    }),

    // 2. Total confirmed/posted purchases (aggregate instead of findMany)
    db.purchaseInvoice.aggregate({
      where: { companyId, status: { in: ['CONFIRMED', 'POSTED', 'PAID', 'PARTIAL_PAID'] } },
      _sum: { totalAmount: true },
    }),

    // 3. Customer count
    db.customer.count({ where: { companyId, isActive: true } }),

    // 4. Supplier count
    db.supplier.count({ where: { companyId, isActive: true } }),

    // 5. Inventory value - use raw SQL for better performance
    db.$queryRaw<{ inventory_value: number }[]>`
      SELECT COALESCE(SUM(ib.quantity * ib."avgCost"), 0) as inventory_value
      FROM "ItemBalance" ib
      JOIN "Item" i ON i.id = ib."itemId"
      WHERE i."companyId" = ${companyId}
    `,

    // 6. Due invoices count
    db.salesInvoice.count({
      where: { companyId, balanceDue: { gt: 0 }, status: { in: ['CONFIRMED', 'POSTED', 'PARTIAL_PAID'] } },
    }),

    // 7. Recent activities - parallel fetch (already was parallel)
    Promise.all([
      db.stockMovement.findMany({
        where: { companyId },
        take: 5,
        orderBy: { date: 'desc' },
        select: {
          id: true,
          type: true,
          date: true,
          totalCost: true,
          item: { select: { nameAr: true } },
          warehouse: { select: { nameAr: true } },
        },
      }),
      db.salesInvoice.findMany({
        where: { companyId },
        take: 5,
        orderBy: { date: 'desc' },
        select: {
          id: true,
          date: true,
          totalAmount: true,
          customer: { select: { nameAr: true } },
        },
      }),
      db.purchaseInvoice.findMany({
        where: { companyId },
        take: 5,
        orderBy: { date: 'desc' },
        select: {
          id: true,
          date: true,
          totalAmount: true,
          supplier: { select: { nameAr: true } },
        },
      }),
    ]),
  ])

  const totalSales = salesAgg._sum.totalAmount || 0
  const totalPurchases = purchaseAgg._sum.totalAmount || 0
  const inventoryValue = Number(inventoryValueResult[0]?.inventory_value || 0)

  const [stockMovements, recentSales, recentPurchases] = recentActivities

  // Combine and sort activities
  const activities: Array<{
    id: string; type: string; date: Date; description: string; amount: number;
  }> = []

  for (const sm of stockMovements) {
    activities.push({
      id: sm.id,
      type: 'stock_movement',
      date: sm.date,
      description: `${sm.type === 'IN' ? 'وارد' : 'صادر'} - ${sm.item.nameAr} (${sm.warehouse.nameAr})`,
      amount: sm.totalCost,
    })
  }

  for (const si of recentSales) {
    activities.push({
      id: si.id,
      type: 'sales_invoice',
      date: si.date,
      description: `فاتورة بيع - ${si.customer.nameAr}`,
      amount: si.totalAmount,
    })
  }

  for (const pi of recentPurchases) {
    activities.push({
      id: pi.id,
      type: 'purchase_invoice',
      date: pi.date,
      description: `فاتورة شراء - ${pi.supplier.nameAr}`,
      amount: pi.totalAmount,
    })
  }

  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const recentActivitiesList = activities.slice(0, 10)

  return {
    totalSales: Math.round(totalSales * 100) / 100,
    totalPurchases: Math.round(totalPurchases * 100) / 100,
    customerCount,
    supplierCount,
    inventoryValue: Math.round(inventoryValue * 100) / 100,
    dueInvoices: dueInvoicesCount,
    recentActivities: recentActivitiesList,
  }
}
