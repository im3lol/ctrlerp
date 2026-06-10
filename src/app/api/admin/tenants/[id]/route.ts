import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-guard'
import { logActivity } from '@/lib/activity-logger'
import { invalidateCache } from '@/lib/cache'

// GET: Tenant details with license, companies, users
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth(request)
    const { id } = await params

    // Parallel: tenant details + user count + total revenue
    const [tenant, userCount, totalRevenue] = await Promise.all([
      db.tenant.findUnique({
        where: { id },
        include: {
          licenses: {
            orderBy: { createdAt: 'desc' },
            include: { history: { orderBy: { createdAt: 'desc' }, take: 10 } },
          },
          companies: {
            select: {
              id: true,
              nameAr: true,
              nameEn: true,
              status: true,
              createdAt: true,
            },
          },
          owner: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
            },
          },
          revenueRecords: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      }),
      db.companyUser.count({
        where: {
          company: { tenantId: id },
          isActive: true,
        },
      }),
      db.revenueRecord.aggregate({
        where: { tenantId: id },
        _sum: { amount: true },
      }),
    ])

    if (!tenant) {
      return NextResponse.json({ error: 'المستأجر غير موجود' }, { status: 404 })
    }

    return NextResponse.json({
      ...tenant,
      userCount,
      totalRevenue: totalRevenue._sum.amount || 0,
    })
  } catch (error) {
    console.error('Get tenant error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: message.includes('غير مصرح') ? 401 : 500 })
  }
}

// PATCH: Update tenant status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminAuth(request)
    const { id } = await params

    const body = await request.json()
    const { status, name, email, phone } = body

    const existing = await db.tenant.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'المستأجر غير موجود' }, { status: 404 })
    }

    const data: any = {}
    if (status && ['active', 'suspended', 'cancelled'].includes(status)) {
      data.status = status
    }
    if (name !== undefined) data.name = name
    if (email !== undefined) data.email = email
    if (phone !== undefined) data.phone = phone

    const tenant = await db.tenant.update({
      where: { id },
      data,
      include: {
        licenses: { orderBy: { createdAt: 'desc' } },
        owner: {
          select: { id: true, name: true, username: true },
        },
      },
    })

    // Log activity (fire-and-forget)
    if (status && status !== existing.status) {
      let action = 'tenant_updated'
      let description = `تحديث بيانات المستأجر ${existing.name}`

      if (status === 'suspended') {
        action = 'tenant_suspended'
        description = `تعليق المستأجر ${existing.name}`
      } else if (status === 'active') {
        action = 'tenant_activated'
        description = `تفعيل المستأجر ${existing.name}`
      } else if (status === 'cancelled') {
        action = 'tenant_cancelled'
        description = `إلغاء المستأجر ${existing.name}`
      }

      logActivity({
        action,
        category: 'tenant',
        description,
        performedBy: admin.id,
        performerName: admin.name,
        targetType: 'tenant',
        targetId: id,
        targetName: existing.name,
        details: { oldStatus: existing.status, newStatus: status },
      })
    } else {
      logActivity({
        action: 'tenant_updated',
        category: 'tenant',
        description: `تحديث بيانات المستأجر ${existing.name}`,
        performedBy: admin.id,
        performerName: admin.name,
        targetType: 'tenant',
        targetId: id,
        targetName: existing.name,
        details: { name, email, phone },
      })
    }

    // Invalidate caches
    invalidateCache('admin:')

    return NextResponse.json({ tenant })
  } catch (error) {
    console.error('Update tenant error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: message.includes('غير مصرح') ? 401 : 500 })
  }
}

// DELETE: Soft delete (set status to cancelled)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminAuth(request)
    const { id } = await params

    const existing = await db.tenant.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'المستأجر غير موجود' }, { status: 404 })
    }

    const tenant = await db.tenant.update({
      where: { id },
      data: { status: 'cancelled' },
    })

    // Log activity (fire-and-forget)
    logActivity({
      action: 'tenant_cancelled',
      category: 'tenant',
      description: `حذف/إلغاء المستأجر ${existing.name}`,
      performedBy: admin.id,
      performerName: admin.name,
      targetType: 'tenant',
      targetId: id,
      targetName: existing.name,
    })

    // Invalidate caches
    invalidateCache('admin:')

    return NextResponse.json({ tenant })
  } catch (error) {
    console.error('Delete tenant error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: message.includes('غير مصرح') ? 401 : 500 })
  }
}
