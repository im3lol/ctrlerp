import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/admin-guard'
import { createBackup, listBackups, deleteBackup } from '@/lib/backup'
import { db } from '@/lib/db'

// GET: List all backups
export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request)
    if (!admin) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const backups = listBackups()
    return NextResponse.json({ backups })
  } catch (error) {
    console.error('List backups error:', error)
    return NextResponse.json({ error: 'فشل تحميل النسخ الاحتياطية' }, { status: 500 })
  }
}

// POST: Create a new backup
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request)
    if (!admin) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const body = await request.json()
    const { type, tenantId } = body

    // If tenantId is provided, backup that tenant's database
    let tenantName: string | undefined
    let databaseUrl: string | undefined

    if (tenantId) {
      const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
      if (tenant) {
        tenantName = tenant.name
        databaseUrl = tenant.databaseUrl || undefined
      }
    }

    const result = await createBackup({
      type: type || 'manual',
      tenantId,
      tenantName,
      databaseUrl,
    })

    if (result.success) {
      // Log activity
      const { logActivity } = await import('@/lib/activity-logger')
      logActivity({
        action: 'backup_created',
        category: 'system',
        description: `تم إنشاء نسخة احتياطية: ${result.backup?.filename}`,
        performedBy: admin.id,
        performerName: admin.name,
        targetType: 'backup',
        targetId: result.backup?.id,
        targetName: result.backup?.filename,
      })

      return NextResponse.json({ backup: result.backup }, { status: 201 })
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error('Create backup error:', error)
    return NextResponse.json({ error: 'فشل إنشاء النسخة الاحتياطية' }, { status: 500 })
  }
}

// DELETE: Delete a backup
export async function DELETE(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request)
    if (!admin) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')

    if (!filename) {
      return NextResponse.json({ error: 'اسم الملف مطلوب' }, { status: 400 })
    }

    const deleted = deleteBackup(filename)
    if (deleted) {
      return NextResponse.json({ message: 'تم حذف النسخة الاحتياطية' })
    } else {
      return NextResponse.json({ error: 'الملف غير موجود' }, { status: 404 })
    }
  } catch (error) {
    console.error('Delete backup error:', error)
    return NextResponse.json({ error: 'فشل حذف النسخة الاحتياطية' }, { status: 500 })
  }
}
