import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-guard'
import { logActivity } from '@/lib/activity-logger'
import { invalidateCache } from '@/lib/cache'

// PATCH: Update tenant's custom domain or subdomain
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminAuth(request)
    const { id } = await params
    const body = await request.json()
    const { subdomain, customDomain } = body

    const tenant = await db.tenant.findUnique({ where: { id } })
    if (!tenant) {
      return NextResponse.json({ error: 'المستأجر غير موجود' }, { status: 404 })
    }

    const updates: any = {}

    if (subdomain !== undefined) {
      // Validate subdomain format
      const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/
      if (!subdomainRegex.test(subdomain)) {
        return NextResponse.json({ error: 'صيغة النطاق الفرعي غير صالحة. استخدم أحرف صغيرة وأرقام وشرطات فقط' }, { status: 400 })
      }

      // Check uniqueness
      const existing = await db.tenant.findFirst({
        where: { subdomain, id: { not: id } },
      })
      if (existing) {
        return NextResponse.json({ error: 'النطاق الفرعي مستخدم بالفعل' }, { status: 400 })
      }

      updates.subdomain = subdomain
    }

    if (customDomain !== undefined) {
      if (customDomain) {
        // Validate domain format
        const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/
        if (!domainRegex.test(customDomain)) {
          return NextResponse.json({ error: 'صيغة النطاق المخصص غير صالحة' }, { status: 400 })
        }

        // Check uniqueness
        const existing = await db.tenant.findFirst({
          where: { customDomain, id: { not: id } },
        })
        if (existing) {
          return NextResponse.json({ error: 'النطاق المخصص مستخدم بالفعل' }, { status: 400 })
        }
      }

      updates.customDomain = customDomain || null
    }

    const updatedTenant = await db.tenant.update({
      where: { id },
      data: updates,
    })

    logActivity({
      action: 'tenant_domain_updated',
      category: 'tenant',
      description: `تحديث نطاق المستأجر ${tenant.name}: ${JSON.stringify(updates)}`,
      performedBy: admin.id,
      performerName: admin.name,
      targetType: 'tenant',
      targetId: id,
      targetName: tenant.name,
      details: updates,
    })

    invalidateCache('admin:')

    return NextResponse.json({ tenant: updatedTenant })
  } catch (error) {
    console.error('Update domain error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
