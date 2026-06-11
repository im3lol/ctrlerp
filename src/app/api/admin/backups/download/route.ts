import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/admin-guard'
import { getBackupFilePath } from '@/lib/backup'
import { createReadStream } from 'fs'

// GET: Download a backup file
export async function GET(request: NextRequest) {
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

    // Security: prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'اسم الملف غير صالح' }, { status: 400 })
    }

    const filepath = getBackupFilePath(filename)
    if (!filepath) {
      return NextResponse.json({ error: 'الملف غير موجود' }, { status: 404 })
    }

    const stream = createReadStream(filepath)

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Download backup error:', error)
    return NextResponse.json({ error: 'فشل تحميل النسخة الاحتياطية' }, { status: 500 })
  }
}
