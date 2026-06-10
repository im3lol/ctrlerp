import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

export interface AdminUser {
  id: string
  name: string
  username: string
  email: string | null
  role: string
}

/**
 * Verify platform admin authentication from request headers
 */
export async function getAdminFromRequest(request: NextRequest): Promise<AdminUser | null> {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '') || request.headers.get('X-Admin-Token')

  if (!token) return null

  const adminToken = await db.platformAdminToken.findUnique({
    where: { token },
    include: { admin: true },
  })

  if (!adminToken || adminToken.expiresAt < new Date() || !adminToken.admin.isActive) {
    return null
  }

  return {
    id: adminToken.admin.id,
    name: adminToken.admin.name,
    username: adminToken.admin.username,
    email: adminToken.admin.email,
    role: adminToken.admin.role,
  }
}

/**
 * Require platform admin authentication
 */
export async function requireAdminAuth(request: NextRequest): Promise<AdminUser> {
  const admin = await getAdminFromRequest(request)
  if (!admin) {
    throw new Error('غير مصرح بالدخول')
  }
  return admin
}

/**
 * Require super_admin role
 */
export async function requireSuperAdmin(request: NextRequest): Promise<AdminUser> {
  const admin = await requireAdminAuth(request)
  if (admin.role !== 'super_admin') {
    throw new Error('هذا الإجراء يتطلب صلاحيات المدير الأعلى')
  }
  return admin
}
