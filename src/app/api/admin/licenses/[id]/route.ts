import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-guard'

// GET: License details with tenant info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth(request)
    const { id } = await params

    const license = await db.license.findUnique({
      where: { id },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
          },
        },
      },
    })

    if (!license) {
      return NextResponse.json({ error: 'الترخيص غير موجود' }, { status: 404 })
    }

    return NextResponse.json({ license })
  } catch (error) {
    console.error('Get license error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: message.includes('غير مصرح') ? 401 : 500 })
  }
}

// PATCH: Update license (extend expiry, change status, change type)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth(request)
    const { id } = await params

    const body = await request.json()
    const { status, type, extendDays, maxUsers, maxCompanies } = body

    const existing = await db.license.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'الترخيص غير موجود' }, { status: 404 })
    }

    const data: any = {}
    if (status && ['active', 'expired', 'suspended', 'cancelled'].includes(status)) {
      data.status = status
    }
    if (type && ['trial', 'basic', 'professional', 'enterprise'].includes(type)) {
      data.type = type
    }
    if (maxUsers !== undefined) {
      data.maxUsers = maxUsers
    }
    if (maxCompanies !== undefined) {
      data.maxCompanies = maxCompanies
    }
    if (extendDays) {
      // Extend from current expiry or from now if already expired
      const currentExpiry = existing.expiresAt
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date()
      data.expiresAt = new Date(baseDate.getTime() + extendDays * 24 * 60 * 60 * 1000)
    }

    const license = await db.license.update({
      where: { id },
      data,
      include: {
        tenant: {
          select: { id: true, name: true, status: true },
        },
      },
    })

    return NextResponse.json({ license })
  } catch (error) {
    console.error('Update license error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: message.includes('غير مصرح') ? 401 : 500 })
  }
}
