import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-guard'
import { provisionTenantDatabase, seedTenantDatabase } from '@/lib/tenant-db'
import { logActivity } from '@/lib/activity-logger'
import { invalidateCache } from '@/lib/cache'

// POST: Provision database for a tenant (or re-provision if failed)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminAuth(request)
    const { id } = await params

    const tenant = await db.tenant.findUnique({ where: { id } })
    if (!tenant) {
      return NextResponse.json({ error: 'المستأجر غير موجود' }, { status: 404 })
    }

    // Provision the database
    const result = await provisionTenantDatabase(id)

    if (result.success) {
      // Seed initial data
      const seedResult = await seedTenantDatabase(
        id,
        'admin',
        'Admin@2026',
        'مدير النظام',
        tenant.name
      )

      if (!seedResult.success) {
        console.error('Seed failed:', seedResult.error)
      }

      logActivity({
        action: 'tenant_db_provisioned',
        category: 'tenant',
        description: `توفير قاعدة بيانات للمستأجر: ${tenant.name}`,
        performedBy: admin.id,
        performerName: admin.name,
        targetType: 'tenant',
        targetId: id,
        targetName: tenant.name,
        details: { databaseName: result.databaseName, seedSuccess: seedResult.success },
      })
    }

    invalidateCache('admin:')

    const updatedTenant = await db.tenant.findUnique({ where: { id } })

    return NextResponse.json({
      success: result.success,
      tenant: updatedTenant,
      databaseName: result.databaseName,
      error: result.error,
    })
  } catch (error) {
    console.error('Provision error:', error)
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
