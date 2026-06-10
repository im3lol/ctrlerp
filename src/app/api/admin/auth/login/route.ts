import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity-logger'
import { invalidateCache } from '@/lib/cache'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' }, { status: 400 })
    }

    const admin = await db.platformAdmin.findUnique({
      where: { username },
    })

    if (!admin) {
      return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
    }

    // Verify password (bcrypt with legacy base64 support)
    const { verifyPassword, isLegacyPassword, hashPassword } = await import('@/lib/password')
    const isValid = await verifyPassword(password, admin.password)
    if (!isValid) {
      return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
    }

    if (!admin.isActive) {
      return NextResponse.json({ error: 'الحساب معطل' }, { status: 403 })
    }

    // Auto-migrate legacy base64 passwords to bcrypt on successful login
    if (isLegacyPassword(admin.password)) {
      try {
        const bcryptHash = await hashPassword(password)
        await db.platformAdmin.update({
          where: { id: admin.id },
          data: { password: bcryptHash },
        })
      } catch (migrateError) {
        console.error('[Admin Auth] Failed to migrate password for admin:', admin.id, migrateError)
      }
    }

    // Parallel: Create token + clean up expired tokens
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await Promise.all([
      db.platformAdminToken.create({
        data: {
          adminId: admin.id,
          token,
          expiresAt,
        },
      }),
      // Clean up expired tokens in parallel
      db.platformAdminToken.deleteMany({
        where: {
          adminId: admin.id,
          expiresAt: { lt: new Date() },
        },
      }),
    ])

    // Get client IP
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined

    // Log admin login (fire-and-forget - don't block response)
    logActivity({
      action: 'admin_login',
      category: 'auth',
      description: `تسجيل دخول المدير: ${admin.name}`,
      performedBy: admin.id,
      performerName: admin.name,
      targetType: 'admin',
      targetId: admin.id,
      targetName: admin.name,
      ipAddress,
    })

    // Invalidate admin caches on login
    invalidateCache('admin:')

    return NextResponse.json({
      admin: {
        id: admin.id,
        name: admin.name,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
      token,
    })
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
