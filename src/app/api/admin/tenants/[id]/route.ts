import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-guard'
import { logActivity } from '@/lib/activity-logger'
import { invalidateCache } from '@/lib/cache'
import { getPoolStats } from '@/lib/tenant-db'

// GET: Tenant details with license, companies, domain, and DB info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth(request)
    const { id } = await params

    // Parallel: tenant details + revenue
    const [tenant, totalRevenue] = await Promise.all([
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
          revenueRecords: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
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

    // Get connection pool stats
    const poolStats = getPoolStats()

    // Try to get user count from tenant DB if ready
    let tenantUserCount = null
    if (tenant.dbStatus === 'ready' && tenant.databaseUrl) {
      try {
        const { getTenantDb } = await import('@/lib/tenant-db')
        const tenantDb = await getTenantDb(id)
        tenantUserCount = await tenantDb.user.count()
      } catch {
        // DB not accessible
      }
    }

    return NextResponse.json({
      ...tenant,
      tenantUserCount,
      totalRevenue: totalRevenue._sum.amount || 0,
      poolStats: poolStats.tenants.includes(id) ? 'active' : 'idle',
    })
  } catch (error) {
    console.error('Get tenant error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: message.includes('غير مصرح') ? 401 : 500 })
  }
}

// PATCH: Update tenant info (status, domain, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminAuth(request)
    const { id } = await params

    const body = await request.json()
    const { status, name, email, phone, subdomain, customDomain } = body

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

    // Domain updates
    if (subdomain !== undefined) {
      const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/
      if (!subdomainRegex.test(subdomain)) {
        return NextResponse.json({ error: 'صيغة النطاق الفرعي غير صالحة' }, { status: 400 })
      }
      const existingSubdomain = await db.tenant.findFirst({
        where: { subdomain, id: { not: id } },
      })
      if (existingSubdomain) {
        return NextResponse.json({ error: 'النطاق الفرعي مستخدم بالفعل' }, { status: 400 })
      }
      data.subdomain = subdomain
    }

    if (customDomain !== undefined) {
      if (customDomain) {
        const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/
        if (!domainRegex.test(customDomain)) {
          return NextResponse.json({ error: 'صيغة النطاق المخصص غير صالحة' }, { status: 400 })
        }
        const existingDomain = await db.tenant.findFirst({
          where: { customDomain, id: { not: id } },
        })
        if (existingDomain) {
          return NextResponse.json({ error: 'النطاق المخصص مستخدم بالفعل' }, { status: 400 })
        }
      }
      data.customDomain = customDomain || null
    }

    const tenant = await db.tenant.update({
      where: { id },
      data,
      include: {
        licenses: { orderBy: { createdAt: 'desc' } },
      },
    })

    // Log activity
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
        details: { name, email, phone, subdomain, customDomain },
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

    invalidateCache('admin:')

    return NextResponse.json({ tenant })
  } catch (error) {
    console.error('Delete tenant error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: message.includes('غير مصرح') ? 401 : 500 })
  }
}
