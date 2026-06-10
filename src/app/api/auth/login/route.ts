import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantDb, getTenantDbBySubdomain } from '@/lib/tenant-db'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, tenantSubdomain, tenantId } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور' },
        { status: 400 }
      )
    }

    // ── Resolve tenant database ──
    let tenantDb
    let resolvedTenantId = tenantId
    let resolvedSubdomain = tenantSubdomain

    // Method 1: Try to get tenant from request header (set by middleware)
    const headerSubdomain = request.headers.get('X-Tenant-Subdomain')
    if (headerSubdomain) {
      resolvedSubdomain = headerSubdomain
    }

    // Method 2: Resolve from subdomain
    if (resolvedSubdomain && !resolvedTenantId) {
      const tenantResult = await getTenantDbBySubdomain(resolvedSubdomain)
      if (tenantResult) {
        resolvedTenantId = tenantResult.tenantId
        tenantDb = tenantResult.prisma
      }
    }

    // Method 3: Use explicit tenantId
    if (resolvedTenantId && !tenantDb) {
      try {
        tenantDb = await getTenantDb(resolvedTenantId)
      } catch {
        // Fall back to platform DB for legacy users
      }
    }

    // ── Check license in platform DB ──
    let licenseInfo: {
      active: boolean
      type: string | null
      expiresAt: string | null
      daysLeft: number | null
      isTrial: boolean
      isLifetime: boolean
      tenantStatus: string | null
      tenantId: string
      subdomain: string | null
      customDomain: string | null
    } | null = null

    if (resolvedTenantId) {
      const tenant = await db.tenant.findUnique({
        where: { id: resolvedTenantId },
        include: {
          licenses: {
            where: { status: 'active' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })

      if (tenant) {
        if (tenant.status === 'suspended') {
          return NextResponse.json(
            { error: 'حسابك معلق. يرجى التواصل مع إدارة المنصة' },
            { status: 403 }
          )
        }
        if (tenant.status === 'cancelled') {
          return NextResponse.json(
            { error: 'حسابك ملغي. يرجى التواصل مع إدارة المنصة' },
            { status: 403 }
          )
        }

        if (tenant.dbStatus !== 'ready') {
          return NextResponse.json(
            { error: 'قاعدة بيانات المستأجر غير جاهزة بعد. يرجى المحاولة لاحقاً' },
            { status: 503 }
          )
        }

        const license = tenant.licenses[0]
        if (license) {
          const now = new Date()
          const expiry = new Date(license.expiresAt)
          const daysLeft = Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          const isExpired = !license.isLifetime && expiry < now

          if (isExpired) {
            return NextResponse.json(
              { error: 'انتهت صلاحية الترخيص. يرجى التجديد للمتابعة' },
              { status: 403 }
            )
          }

          licenseInfo = {
            active: true,
            type: license.type,
            expiresAt: license.expiresAt.toISOString(),
            daysLeft,
            isTrial: license.type === 'trial',
            isLifetime: license.isLifetime,
            tenantStatus: tenant.status,
            tenantId: tenant.id,
            subdomain: tenant.subdomain,
            customDomain: tenant.customDomain,
          }
        } else {
          return NextResponse.json(
            { error: 'لا يوجد ترخيص نشط. يرجى التواصل مع إدارة المنصة' },
            { status: 403 }
          )
        }
      }
    }

    // ── Authenticate user in the tenant database ──
    if (!tenantDb) {
      return NextResponse.json(
        { error: 'لم يتم تحديد المستأجر. يرجى الدخول من خلال الرابط المخصص لك' },
        { status: 400 }
      )
    }

    // Support login by username or email
    const user = await tenantDb.user.findFirst({
      where: {
        OR: [
          { username },
          { email: username },
        ]
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'هذا الحساب معطل. تواصل مع المسؤول' },
        { status: 403 }
      )
    }

    // Verify password (bcrypt with legacy base64 support)
    const { verifyPassword, isLegacyPassword, hashPassword } = await import('@/lib/password')
    const isValid = await verifyPassword(password, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' },
        { status: 401 }
      )
    }

    // Auto-migrate legacy base64 passwords to bcrypt on successful login
    if (isLegacyPassword(user.password)) {
      try {
        const bcryptHash = await hashPassword(password)
        await tenantDb.user.update({
          where: { id: user.id },
          data: { password: bcryptHash },
        })
      } catch (migrateError) {
        console.error('[Auth] Failed to migrate password for user:', user.id, migrateError)
        // Don't block login if migration fails
      }
    }

    // Parallel: Get user's companies + clean up expired tokens
    const [companyUsers] = await Promise.all([
      tenantDb.companyUser.findMany({
        where: { userId: user.id, isActive: true },
        select: {
          companyId: true,
          role: true,
          company: {
            select: { id: true, nameAr: true, nameEn: true, tenantId: true },
          },
        },
      }),
      // Clean up expired tokens in background
      tenantDb.accessToken.deleteMany({
        where: {
          userId: user.id,
          expiresAt: { lt: new Date() },
        },
      }),
    ])

    const companies = companyUsers.map((cu: any) => ({
      id: cu.company.id,
      nameAr: cu.company.nameAr,
      nameEn: cu.company.nameEn,
      role: cu.role,
    }))

    const primaryCompany = companyUsers[0]

    // Generate a new access token (valid for 7 days)
    const token = randomUUID()
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await tenantDb.accessToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: tokenExpiresAt,
      },
    })

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        companyId: primaryCompany?.companyId || null,
        companyRole: primaryCompany?.role || null,
      },
      companies,
      token,
      license: licenseInfo,
      tenantId: resolvedTenantId,
      subdomain: resolvedSubdomain || licenseInfo?.subdomain,
    })
  } catch (error) {
    console.error('Login error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
