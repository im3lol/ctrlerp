import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور' },
        { status: 400 }
      )
    }

    // Support login by username or email
    const user = await db.user.findFirst({
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

    // Verify password (base64 encoded)
    const encodedPassword = Buffer.from(password).toString('base64')
    if (user.password !== encodedPassword) {
      return NextResponse.json(
        { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' },
        { status: 401 }
      )
    }

    // Parallel: Get user's companies + clean up expired tokens
    const [companyUsers] = await Promise.all([
      db.companyUser.findMany({
        where: { userId: user.id, isActive: true },
        select: {
          companyId: true,
          role: true,
          company: {
            select: { id: true, nameAr: true, nameEn: true, tenantId: true },
          },
        },
      }),
      // Clean up expired tokens in background (non-blocking)
      db.accessToken.deleteMany({
        where: {
          userId: user.id,
          expiresAt: { lt: new Date() },
        },
      }),
    ])

    const companies = companyUsers.map((cu) => ({
      id: cu.company.id,
      nameAr: cu.company.nameAr,
      nameEn: cu.company.nameEn,
      role: cu.role,
    }))

    const primaryCompany = companyUsers[0]

    // ── License check ──
    let licenseInfo: {
      active: boolean
      type: string | null
      expiresAt: string | null
      daysLeft: number | null
      isTrial: boolean
      tenantStatus: string | null
    } | null = null

    if (primaryCompany?.company?.tenantId) {
      const tenant = await db.tenant.findUnique({
        where: { id: primaryCompany.company.tenantId },
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
            tenantStatus: tenant.status,
          }
        } else {
          return NextResponse.json(
            { error: 'لا يوجد ترخيص نشط. يرجى التواصل مع إدارة المنصة' },
            { status: 403 }
          )
        }
      }
    }

    // Generate a new access token (valid for 7 days for better UX)
    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await db.accessToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
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
