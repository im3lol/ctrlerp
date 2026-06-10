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

// PATCH: Update license (extend expiry, change status, change type, activate with months/lifetime)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth(request)
    const { id } = await params

    const body = await request.json()
    const { status, type, extendDays, extendMonths, maxUsers, maxCompanies, isLifetime, price, currency, activateLifetime, activateMonths } = body

    const existing = await db.license.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'الترخيص غير موجود' }, { status: 404 })
    }

    const data: any = {}
    if (status && ['active', 'expired', 'suspended', 'cancelled'].includes(status)) {
      data.status = status
    }
    if (type && ['trial', 'basic', 'professional', 'enterprise', 'lifetime'].includes(type)) {
      data.type = type
    }
    if (maxUsers !== undefined) {
      data.maxUsers = maxUsers
    }
    if (maxCompanies !== undefined) {
      data.maxCompanies = maxCompanies
    }
    if (price !== undefined) {
      data.price = price
    }
    if (currency !== undefined) {
      data.currency = currency
    }
    if (isLifetime !== undefined) {
      data.isLifetime = isLifetime
    }

    // Activate for specific months
    if (activateMonths && activateMonths > 0) {
      data.status = 'active'
      data.isLifetime = false
      data.type = data.type || existing.type === 'trial' ? 'basic' : existing.type
      const baseDate = existing.expiresAt > new Date() ? existing.expiresAt : new Date()
      data.expiresAt = new Date(baseDate)
      data.expiresAt.setMonth(data.expiresAt.getMonth() + activateMonths)
    }

    // Activate lifetime
    if (activateLifetime) {
      data.status = 'active'
      data.isLifetime = true
      data.type = data.type || 'lifetime'
      data.expiresAt = new Date('2099-12-31T23:59:59.999Z')
    }

    // Extend by days (for trial extension)
    if (extendDays && extendDays > 0) {
      const currentExpiry = existing.expiresAt
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date()
      data.expiresAt = new Date(baseDate.getTime() + extendDays * 24 * 60 * 60 * 1000)
      if (data.status !== 'active') {
        data.status = 'active'
      }
    }

    // Extend by months
    if (extendMonths && extendMonths > 0) {
      const currentExpiry = existing.expiresAt
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date()
      data.expiresAt = new Date(baseDate)
      data.expiresAt.setMonth(data.expiresAt.getMonth() + extendMonths)
      if (data.status !== 'active') {
        data.status = 'active'
      }
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
