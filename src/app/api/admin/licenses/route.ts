import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-guard'
import { logActivity, logLicenseHistory, logRevenue } from '@/lib/activity-logger'
import { cached, CACHE_TTL, invalidateCache } from '@/lib/cache'

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

    // Parallel: paginated list + count + revenue stats (using aggregate instead of findMany all)
    const [licenses, total, revenueStats] = await Promise.all([
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

      // Use aggregate/groupBy instead of fetching ALL licenses into memory
      Promise.all([
        db.license.aggregate({
          where: { status: 'active', price: { gt: 0 } },
          _sum: { price: true },
          _count: { id: true },
        }),
        db.license.aggregate({
          where: { status: 'active', isLifetime: false, type: { not: 'trial' }, monthlyPrice: { gt: 0 } },
          _sum: { monthlyPrice: true },
        }),
        db.license.aggregate({
          where: { status: 'active', isLifetime: true, price: { gt: 0 } },
          _sum: { price: true },
        }),
      ]),
    ])

    const [totalRev, mrrRev, ltRev] = revenueStats

    return NextResponse.json({
      licenses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      revenue: {
        totalRevenue: totalRev._sum.price || 0,
        monthlyRecurring: mrrRev._sum.monthlyPrice || 0,
        lifetimeRevenue: ltRev._sum.price || 0,
        activePaidCount: totalRev._count.id || 0,
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
    const admin = await requireAdminAuth(request)

    const body = await request.json()
    const { tenantId, type, maxUsers, maxCompanies, durationMonths, isLifetime, price, currency, monthlyPrice } = body

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
      expiresAt = new Date('2099-12-31T23:59:59.999Z')
    } else if (durationMonths && durationMonths > 0) {
      expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + durationMonths)
    } else if (type === 'trial') {
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    } else {
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

    const licensePrice = price || 0
    const licenseMonthlyPrice = monthlyPrice || 0
    const licenseCurrency = currency || 'EGP'

    const license = await db.license.create({
      data: {
        tenantId,
        key: licenseKey,
        type: lifetime && type !== 'lifetime' ? type : type,
        status: 'active',
        maxUsers: defaultMaxUsers,
        maxCompanies: defaultMaxCompanies,
        isLifetime: lifetime,
        price: licensePrice,
        monthlyPrice: licenseMonthlyPrice,
        currency: licenseCurrency,
        expiresAt,
      },
      include: {
        tenant: {
          select: { id: true, name: true, status: true },
        },
      },
    })

    // Log license creation, activity, and revenue in parallel (fire-and-forget)
    logLicenseHistory({
      licenseId: license.id,
      action: 'created',
      newStatus: 'active',
      newType: license.type,
      newExpiresAt: license.expiresAt,
      newPrice: licensePrice,
      performedBy: admin.id,
      details: { key: licenseKey, maxUsers: defaultMaxUsers, maxCompanies: defaultMaxCompanies },
    })

    logActivity({
      action: 'license_created',
      category: 'license',
      description: `إنشاء ترخيص ${type} للمستأجر ${tenant.name}`,
      performedBy: admin.id,
      performerName: admin.name,
      targetType: 'license',
      targetId: license.id,
      targetName: tenant.name,
      details: { type, key: licenseKey, price: licensePrice, currency: licenseCurrency },
    })

    // Log revenue if price > 0 (fire-and-forget)
    if (licensePrice > 0) {
      logRevenue({
        tenantId,
        licenseId: license.id,
        amount: licensePrice,
        currency: licenseCurrency,
        type: lifetime ? 'lifetime' : 'subscription',
        periodStart: new Date(),
        periodEnd: expiresAt,
        description: `اشتراك ${type} - ${tenant.name}`,
      })
    }

    // Invalidate caches since data changed
    invalidateCache('admin:')

    // Generate signed license key for the tenant
    let encodedLicenseKey: string | undefined
    try {
      const { signLicensePayload, encodeLicenseKey } = await import('@/lib/license-crypto')

      const payload = {
        licenseId: license.id,
        tenantId,
        tenantName: tenant.name,
        type: license.type as any,
        maxUsers: defaultMaxUsers,
        maxCompanies: defaultMaxCompanies,
        isLifetime: lifetime,
        issuedAt: license.startedAt.toISOString(),
        expiresAt: license.expiresAt.toISOString(),
        price: licensePrice,
        monthlyPrice: licenseMonthlyPrice,
        currency: licenseCurrency,
        features: [],
        version: 1,
      }

      // Get private key from env (only available on platform server)
      const privateKey = process.env.LICENSE_PRIVATE_KEY
      if (privateKey) {
        const signedKey = signLicensePayload(payload, privateKey.replace(/\\n/g, '\n'))
        encodedLicenseKey = encodeLicenseKey(signedKey)

        // Store in tenant's LicenseStore
        try {
          const { getTenantDb } = await import('@/lib/tenant-db')
          const tenantDb = await getTenantDb(tenantId)
          await tenantDb.licenseStore.upsert({
            where: { licenseId: license.id },
            create: {
              licenseId: license.id,
              licenseKey: licenseKey,
              signedKey: encodedLicenseKey,
              tenantId,
              type: license.type,
              status: 'active',
              maxUsers: defaultMaxUsers,
              maxCompanies: defaultMaxCompanies,
              isLifetime: lifetime,
              price: licensePrice,
              monthlyPrice: licenseMonthlyPrice,
              currency: licenseCurrency,
              features: JSON.stringify([]),
              issuedAt: license.startedAt,
              expiresAt: license.expiresAt,
              activatedAt: new Date(),
              lastVerifiedAt: new Date(),
              verificationCount: 1,
            },
            update: {
              signedKey: encodedLicenseKey,
              status: 'active',
              type: license.type,
              maxUsers: defaultMaxUsers,
              maxCompanies: defaultMaxCompanies,
              isLifetime: lifetime,
              expiresAt: license.expiresAt,
              lastVerifiedAt: new Date(),
            },
          })

          // Invalidate license cache
          const { invalidateCache: invCache } = await import('@/lib/cache')
          invCache('license_status:')
        } catch (e) {
          console.error('Failed to store signed key in tenant DB:', e)
        }
      }
    } catch (error) {
      console.error('Failed to sign license key:', error)
      // Non-critical - license is still created, just not signed
    }

    return NextResponse.json(
      encodedLicenseKey ? { license, encodedLicenseKey } : { license },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create license error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: message.includes('غير مصرح') ? 401 : 500 })
  }
}
