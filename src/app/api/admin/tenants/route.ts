import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-guard'
import { logActivity } from '@/lib/activity-logger'
import { invalidateCache } from '@/lib/cache'
import { provisionTenantDatabase, seedTenantDatabase, generateSubdomain } from '@/lib/tenant-db'

// GET: List all tenants with filtering
export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth(request)

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const dbStatus = searchParams.get('dbStatus') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {}
    if (status && status !== 'all') where.status = status
    if (dbStatus && dbStatus !== 'all') where.dbStatus = dbStatus
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { subdomain: { contains: search, mode: 'insensitive' } },
        { customDomain: { contains: search, mode: 'insensitive' } },
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

// POST: Create new tenant with auto trial license + database provisioning
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminAuth(request)

    const body = await request.json()
    const { name, email, phone, subdomain, customDomain, adminUsername, adminPassword, adminName, companyName } = body

    if (!name) {
      return NextResponse.json({ error: 'اسم المستأجر مطلوب' }, { status: 400 })
    }

    // Generate subdomain from name if not provided
    const tenantSubdomain = subdomain || generateSubdomain(name)

    // Check subdomain uniqueness
    const existingSubdomain = await db.tenant.findUnique({ where: { subdomain: tenantSubdomain } })
    if (existingSubdomain) {
      return NextResponse.json({ error: 'النطاق الفرعي مستخدم بالفعل' }, { status: 400 })
    }

    // Check custom domain uniqueness if provided
    if (customDomain) {
      const existingDomain = await db.tenant.findUnique({ where: { customDomain } })
      if (existingDomain) {
        return NextResponse.json({ error: 'النطاق المخصص مستخدم بالفعل' }, { status: 400 })
      }
    }

    // Create tenant record
    const tenant = await db.tenant.create({
      data: {
        name,
        email,
        phone,
        subdomain: tenantSubdomain,
        customDomain: customDomain || null,
        dbStatus: 'pending',
        planType: 'trial',
      },
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
        currency: 'EGP',
        expiresAt,
      },
    })

    // Provision tenant database (async - don't block response)
    const provisionResult = await provisionTenantDatabase(tenant.id)

    if (provisionResult.success) {
      // Seed initial data in the tenant database
      const seedResult = await seedTenantDatabase(
        tenant.id,
        adminUsername || 'admin',
        adminPassword || 'Admin@2026',
        adminName || 'مدير النظام',
        companyName || name
      )

      if (!seedResult.success) {
        console.error('Failed to seed tenant database:', seedResult.error)
      }
    } else {
      console.error('Failed to provision tenant database:', provisionResult.error)
    }

    // Log activity
    logActivity({
      action: 'tenant_created',
      category: 'tenant',
      description: `إنشاء مستأجر جديد: ${name} مع ترخيص تجريبي 7 أيام وقاعدة بيانات منفصلة`,
      performedBy: admin.id,
      performerName: admin.name,
      targetType: 'tenant',
      targetId: tenant.id,
      targetName: name,
      details: {
        email,
        phone,
        licenseKey,
        subdomain: tenantSubdomain,
        customDomain,
        dbProvisioned: provisionResult.success,
        databaseName: provisionResult.databaseName,
      },
    })

    // ── Sign and store the trial license in tenant's LicenseStore ──
    if (provisionResult.success) {
      try {
        const tenantDb = await getTenantDb(tenant.id)
        const { signLicensePayload, encodeLicenseKey } = await import('@/lib/license-crypto')

        const payload = {
          licenseId: license.id,
          tenantId: tenant.id,
          tenantName: name,
          type: 'trial' as const,
          maxUsers: 1,
          maxCompanies: 1,
          isLifetime: false,
          issuedAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString(),
          price: 0,
          monthlyPrice: 0,
          currency: 'EGP',
          features: [],
          version: 1,
        }

        const privateKey = process.env.LICENSE_PRIVATE_KEY
        if (privateKey) {
          const signedKey = signLicensePayload(payload, privateKey.replace(/\\n/g, '\n'))
          const encodedKey = encodeLicenseKey(signedKey)

          await tenantDb.licenseStore.create({
            data: {
              licenseId: license.id,
              licenseKey: licenseKey,
              signedKey: encodedKey,
              tenantId: tenant.id,
              type: 'trial',
              status: 'active',
              maxUsers: 1,
              maxCompanies: 1,
              isLifetime: false,
              price: 0,
              monthlyPrice: 0,
              currency: 'EGP',
              features: JSON.stringify([]),
              issuedAt: new Date(),
              expiresAt,
              activatedAt: new Date(),
              lastVerifiedAt: new Date(),
              verificationCount: 1,
            },
          })
        }
      } catch (error) {
        console.error('Failed to sign trial license for admin-created tenant:', error)
        // Non-critical for trial
      }
    }

    // Invalidate caches
    invalidateCache('admin:')

    // Fetch updated tenant with DB status
    const updatedTenant = await db.tenant.findUnique({
      where: { id: tenant.id },
      include: { licenses: { take: 1, orderBy: { createdAt: 'desc' } } },
    })

    return NextResponse.json({
      tenant: updatedTenant,
      license,
      provision: {
        success: provisionResult.success,
        databaseName: provisionResult.databaseName,
        error: provisionResult.error,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Create tenant error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: message.includes('غير مصرح') ? 401 : 500 })
  }
}
