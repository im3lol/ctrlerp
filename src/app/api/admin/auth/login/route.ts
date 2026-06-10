import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'يرجى إدخال اسم المستخدم وكلمة المرور' },
        { status: 400 }
      )
    }

    const admin = await db.platformAdmin.findUnique({
      where: { username },
    })

    if (!admin || !admin.isActive) {
      return NextResponse.json(
        { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' },
        { status: 401 }
      )
    }

    // Verify password (base64 encoded - same pattern as existing User model)
    const encodedPassword = Buffer.from(password).toString('base64')
    if (admin.password !== encodedPassword) {
      return NextResponse.json(
        { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' },
        { status: 401 }
      )
    }

    // Clean up expired tokens
    await db.platformAdminToken.deleteMany({
      where: { adminId: admin.id, expiresAt: { lt: new Date() } },
    })

    // Generate new token (valid for 24 hours)
    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await db.platformAdminToken.create({
      data: { adminId: admin.id, token, expiresAt },
    })

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
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    )
  }
}
