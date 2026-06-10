import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST: Seed initial platform admin
export async function POST(request: NextRequest) {
  try {
    // Check if any platform admin exists
    const existingAdmin = await db.platformAdmin.findFirst()

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'يوجد مدير نظام بالفعل', admin: { username: existingAdmin.username, name: existingAdmin.name } },
        { status: 400 }
      )
    }

    // Create default platform admin
    // Password: Admin@2026 → base64 encoded
    const password = Buffer.from('Admin@2026').toString('base64')

    const admin = await db.platformAdmin.create({
      data: {
        username: 'platformadmin',
        name: 'مدير النظام',
        email: 'admin@ctrl-erp.com',
        password,
        role: 'super_admin',
        isActive: true,
      },
    })

    return NextResponse.json({
      message: 'تم إنشاء مدير النظام بنجاح',
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Seed admin error:', error)
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
