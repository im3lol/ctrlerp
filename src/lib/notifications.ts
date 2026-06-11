import { db } from '@/lib/db'
import { getCached, setCache, invalidateCache } from './cache'

export interface CreateNotificationParams {
  type: 'license_expiring' | 'license_expired' | 'user_limit' | 'system' | 'security' | 'backup' | 'tenant_created' | 'tenant_suspended' | 'payment'
  title: string
  message: string
  priority?: 'info' | 'warning' | 'critical'
  targetType?: string
  targetId?: string
  actionUrl?: string
  icon?: string
  expiresInHours?: number
}

/**
 * Create a new notification
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await db.notification.create({
      data: {
        type: params.type,
        title: params.title,
        message: params.message,
        priority: params.priority || 'info',
        targetType: params.targetType,
        targetId: params.targetId,
        actionUrl: params.actionUrl,
        icon: params.icon || getIconForType(params.type),
        expiresAt: params.expiresInHours 
          ? new Date(Date.now() + params.expiresInHours * 60 * 60 * 1000)
          : null,
      },
    })

    // Invalidate cache
    invalidateCache('notifications:')

    return notification
  } catch (error) {
    console.error('[Notification] Failed to create:', error)
    return null
  }
}

/**
 * Get unread notification count (cached for 30 seconds)
 */
export async function getUnreadCount(): Promise<number> {
  const cacheKey = 'notifications:unread_count'
  const cached = getCached<number>(cacheKey)
  if (cached !== null) return cached

  try {
    const count = await db.notification.count({
      where: {
        isRead: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    })
    setCache(cacheKey, count, 30_000)
    return count
  } catch {
    return 0
  }
}

/**
 * Get recent notifications (cached for 15 seconds)
 */
export async function getRecentNotifications(limit = 20) {
  const cacheKey = `notifications:recent:${limit}`
  const cached = getCached<any[]>(cacheKey)
  if (cached) return cached

  try {
    const notifications = await db.notification.findMany({
      where: {
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    setCache(cacheKey, notifications, 15_000)
    return notifications
  } catch {
    return []
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string) {
  try {
    await db.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    })
    invalidateCache('notifications:')
    return true
  } catch {
    return false
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead() {
  try {
    await db.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true, readAt: new Date() },
    })
    invalidateCache('notifications:')
    return true
  } catch {
    return false
  }
}

/**
 * Delete old/expired notifications
 */
export async function cleanupNotifications() {
  try {
    await db.notification.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isRead: true, createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        ],
      },
    })
    invalidateCache('notifications:')
    return true
  } catch {
    return false
  }
}

// Helper: Get icon name for notification type
function getIconForType(type: string): string {
  const icons: Record<string, string> = {
    license_expiring: 'Clock',
    license_expired: 'XCircle',
    user_limit: 'Users',
    system: 'Settings',
    security: 'Shield',
    backup: 'HardDrive',
    tenant_created: 'Building2',
    tenant_suspended: 'Ban',
    payment: 'CreditCard',
  }
  return icons[type] || 'Bell'
}
