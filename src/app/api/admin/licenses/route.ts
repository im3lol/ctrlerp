import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-guard'

// GET: List all licenses with tenant info, filtering
export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth(request)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {}
    if (type) where.type = type
    if (status) where.status = status

    const [licenses, total] = await Promise.all([
      db.license.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
            },
          },
        },
      }),
      db.license.count({ where }),
    ])

    // Calculate revenue stats
    const allLicenses = await db.license.findMany({
      select: { price: true, currency: true, type: true, status: true, isLifetime: true },
    })

    const totalRevenue = allLicenses
      .filter(l => l.status === 'active' && l.price > 0)
      .reduce((sum, l) => sum + l.price, 0)

    const monthlyRecurring = allLicenses
      .filter(l => l.status === 'active' && !l.isLifetime && l.type !== 'trial' && l.price > 0)
      .reduce((sum, l) => sum + l.price, 0)

    const lifetimeRevenue = allLicenses
      .filter(l => l.status === 'active' && l.isLifetime && l.price > 0)
      .reduce((sum, l) => sum + l.price, 0)

    return NextResponse.json({
      licenses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      revenue: {
        totalRevenue,
        monthlyRecurring,
        lifetimeRevenue,
        activePaidCount: allLicenses.filter(l => l.status === 'active' && l.price > 0).length,
      },
    })
  } catch (error) {
    console.error('List licenses error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: message.includes('غير مصرح') ? 401 : 500 })
  }
}

// POST: Create new license for a tenant
export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth(request)

    const body = await request.json()
    const { tenantId, type, maxUsers, maxCompanies, durationMonths, isLifetime, price, currency } = body

    if (!tenantId) {
      return NextResponse.json({ error: 'معرف المستأجر مطلوب' }, { status: 400 })
    }
    if (!type || !['trial', 'basic', 'professional', 'enterprise', 'lifetime'].includes(type)) {
      return NextResponse.json({ error: 'نوع الترخيص غير صالح' }, { status: 400 })
    }

    const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) {
      return NextResponse.json({ error: 'المستأجر غير موجود' }, { status: 404 })
    }

    // Generate license key: CTRL-XXXX-XXXX-XXXX
    const generateKey = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      const group = () =>
        Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
      return `CTRL-${group()}-${group()}-${group()}`
    }

    const licenseKey = generateKey()

    // Ensure uniqueness
    const existingKey = await db.license.findUnique({ where: { key: licenseKey } })
    if (existingKey) {
      return NextResponse.json({ error: 'يرجى المحاولة مرة أخرى' }, { status: 500 })
    }

    // Calculate expiry date
    const lifetime = isLifetime || type === 'lifetime'
    let expiresAt: Date

    if (lifetime) {
      // Lifetime: set to far future date
      expiresAt = new Date('2099-12-31T23:59:59.999Z')
    } else if (durationMonths && durationMonths > 0) {
      // Duration in months
      expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + durationMonths)
    } else if (type === 'trial') {
      // Trial: 7 days
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    } else {
      // Default: 12 months
      expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + 12)
    }

    // Default limits based on type
    const defaultMaxUsers = maxUsers || (type === 'trial' ? 1 : type === 'basic' ? 5 : type === 'professional' ? 20 : type === 'enterprise' ? 100 : type === 'lifetime' ? 999 : 5)
    const defaultMaxCompanies = maxCompanies || (type === 'trial' ? 1 : type === 'basic' ? 2 : type === 'professional' ? 5 : type === 'enterprise' ? 20 : type === 'lifetime' ? 999 : 5)

    // Deactivate existing active licenses for this tenant
    await db.license.updateMany({
      where: { tenantId, status: 'active' },
      data: { status: 'expired' },
    })

    const license = await db.license.create({
      data: {
        tenantId,
        key: licenseKey,
        type: lifetime && type !== 'lifetime' ? type : type,
        status: 'active',
        maxUsers: defaultMaxUsers,
        maxCompanies: defaultMaxCompanies,
        isLifetime: lifetime,
        price: price || 0,
        currency: currency || 'EGP',
        expiresAt,
      },
      include: {
        tenant: {
          select: { id: true, name: true, status: true },
        },
      },
    })

    return NextResponse.json({ license }, { status: 201 })
  } catch (error) {
    console.error('Create license error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: message.includes('غير مصرح') ? 401 : 500 })
  }
}
