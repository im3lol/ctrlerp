import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCached, setCache, CACHE_TTL } from '@/lib/cache'

export interface AdminUser {
  id: string
  name: string
  username: string
  email: string | null
  role: string
}

// Cache admin auth tokens for 60 seconds to avoid DB query on every request
const ADMIN_AUTH_CACHE_TTL = 60_000

/**
 * Verify platform admin authentication from request headers
 * Uses in-memory cache to avoid hitting DB on every single request
 */
export async function getAdminFromRequest(request: NextRequest): Promise<AdminUser | null> {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '') || request.headers.get('X-Admin-Token')

  if (!token) return null

  // Check cache first - this avoids a DB query on every request
  const cacheKey = `admin_auth:${token}`
  const cachedAdmin = getCached<AdminUser>(cacheKey)
  if (cachedAdmin) return cachedAdmin

  // Cache miss - query DB
  const adminToken = await db.platformAdminToken.findUnique({
    where: { token },
    select: {
      expiresAt: true,
      admin: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          isActive: true,
        },
      },
    },
  })

  if (!adminToken || adminToken.expiresAt < new Date() || !adminToken.admin.isActive) {
    return null
  }

  const adminUser: AdminUser = {
    id: adminToken.admin.id,
    name: adminToken.admin.name,
    username: adminToken.admin.username,
    email: adminToken.admin.email,
    role: adminToken.admin.role,
  }

  // Cache the result
  setCache(cacheKey, adminUser, ADMIN_AUTH_CACHE_TTL)

  return adminUser
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
