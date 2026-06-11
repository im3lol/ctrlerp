import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/admin-guard'
import { getRecentNotifications, getUnreadCount, markAsRead, markAllAsRead } from '@/lib/notifications'

// GET: List notifications + unread count
export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request)
    if (!admin) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const [notifications, unreadCount] = await Promise.all([
      getRecentNotifications(limit),
      getUnreadCount(),
    ])

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json({ error: 'فشل تحميل الإشعارات' }, { status: 500 })
  }
}

// PUT: Mark as read / Mark all as read
export async function PUT(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request)
    if (!admin) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId, markAll } = body

    if (markAll) {
      await markAllAsRead()
      return NextResponse.json({ message: 'تم تحديد الكل كمقروء' })
    }

    if (notificationId) {
      await markAsRead(notificationId)
      return NextResponse.json({ message: 'تم التحديد كمقروء' })
    }

    return NextResponse.json({ error: 'معرف الإشعار مطلوب' }, { status: 400 })
  } catch (error) {
    console.error('Update notification error:', error)
    return NextResponse.json({ error: 'فشل تحديث الإشعار' }, { status: 500 })
  }
}
