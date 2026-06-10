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

    return NextResponse.json({
      licenses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
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
    const { tenantId, type, maxUsers, maxCompanies, durationDays } = body

    if (!tenantId) {
      return NextResponse.json({ error: 'معرف المستأجر مطلوب' }, { status: 400 })
    }
    if (!type || !['trial', 'basic', 'professional', 'enterprise'].includes(type)) {
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

    // Default duration based on type
    const duration = durationDays || (type === 'trial' ? 7 : 365)
    const defaultMaxUsers = maxUsers || (type === 'trial' ? 1 : type === 'basic' ? 5 : type === 'professional' ? 20 : 100)
    const defaultMaxCompanies = maxCompanies || (type === 'trial' ? 1 : type === 'basic' ? 2 : type === 'professional' ? 5 : 20)

    const license = await db.license.create({
      data: {
        tenantId,
        key: licenseKey,
        type,
        status: 'active',
        maxUsers: defaultMaxUsers,
        maxCompanies: defaultMaxCompanies,
        expiresAt: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
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
