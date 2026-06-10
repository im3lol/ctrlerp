import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-guard'
import { randomUUID } from 'crypto'

// GET: List all tenants with search/pagination
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
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ]
    }
    if (status) {
      where.status = status
    }

    const [tenants, total] = await Promise.all([
      db.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          licenses: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
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
      tenants: tenants.map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        phone: t.phone,
        status: t.status,
        ownerId: t.ownerId,
        owner: t.owner,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        companyCount: t._count.companies,
        license: t.licenses[0] || null,
      })),
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

// POST: Create tenant + auto-create 7-day trial license
export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth(request)

    const body = await request.json()
    const { name, email, phone, ownerId } = body

    if (!name) {
      return NextResponse.json({ error: 'اسم المستأجر مطلوب' }, { status: 400 })
    }

    // Check if owner already has a tenant
    if (ownerId) {
      const existingTenant = await db.tenant.findUnique({
        where: { ownerId },
      })
      if (existingTenant) {
        return NextResponse.json(
          { error: 'هذا المستخدم لديه مستأجر بالفعل' },
          { status: 400 }
        )
      }
    }

    // Generate license key: CTRL-XXXX-XXXX-XXXX
    const generateKey = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      const group = () =>
        Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
      return `CTRL-${group()}-${group()}-${group()}`
    }

    const licenseKey = generateKey()

    // Check key uniqueness
    const existingKey = await db.license.findUnique({ where: { key: licenseKey } })
    if (existingKey) {
      // Extremely unlikely but regenerate
      return NextResponse.json({ error: 'يرجى المحاولة مرة أخرى' }, { status: 500 })
    }

    const tenant = await db.tenant.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        ownerId: ownerId || null,
        licenses: {
          create: {
            key: licenseKey,
            type: 'trial',
            status: 'active',
            maxUsers: 1,
            maxCompanies: 1,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        },
      },
      include: {
        licenses: true,
        owner: {
          select: { id: true, name: true, username: true },
        },
      },
    })

    return NextResponse.json({ tenant }, { status: 201 })
  } catch (error) {
    console.error('Create tenant error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: message.includes('غير مصرح') ? 401 : 500 })
  }
}
