import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-guard'
import { logActivity } from '@/lib/activity-logger'

// GET: List all tenants with filtering
export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth(request)

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {}
    if (status && status !== 'all') where.status = status
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [tenants, total] = await Promise.all([
      db.tenant.findMany({
        where,
        skip,
        take: limit,
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
      }),
      db.tenant.count({ where }),
    ])

    return NextResponse.json({
      tenants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('List tenants error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: message.includes('غير مصرح') ? 401 : 500 })
  }
}

// POST: Create new tenant with auto trial license
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminAuth(request)

    const body = await request.json()
    const { name, email, phone } = body

    if (!name) {
      return NextResponse.json({ error: 'اسم المستأجر مطلوب' }, { status: 400 })
    }

    const tenant = await db.tenant.create({
      data: { name, email, phone },
    })

    // Generate license key
    const generateKey = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      const group = () =>
        Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
      return `CTRL-${group()}-${group()}-${group()}`
    }

    const licenseKey = generateKey()

    // Create 7-day trial license
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const license = await db.license.create({
      data: {
        tenantId: tenant.id,
        key: licenseKey,
        type: 'trial',
        status: 'active',
        maxUsers: 1,
        maxCompanies: 1,
        isLifetime: false,
        price: 0,
        monthlyPrice: 0,
        expiresAt,
      },
    })

    // Log activity
    await logActivity({
      action: 'tenant_created',
      category: 'tenant',
      description: `إنشاء مستأجر جديد: ${name} مع ترخيص تجريبي 7 أيام`,
      performedBy: admin.id,
      performerName: admin.name,
      targetType: 'tenant',
      targetId: tenant.id,
      targetName: name,
      details: { email, phone, licenseKey },
    })

    return NextResponse.json({ tenant, license }, { status: 201 })
  } catch (error) {
    console.error('Create tenant error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: message.includes('غير مصرح') ? 401 : 500 })
  }
}
