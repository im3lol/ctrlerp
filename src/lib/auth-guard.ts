import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import type { Permission } from '@/lib/permissions'
import { db } from '@/lib/db'
import { getTenantDb } from '@/lib/tenant-db'
import { NextRequest } from 'next/server'

export interface AuthUser {
  id: string
  name: string | null
  username: string
  role: string
  companyId: string | null
  companyRole: string | null
  tenantId: string | null
}

/**
 * Get the current authenticated user from a tenant-specific database
 * Supports both legacy (platform DB) and new (tenant DB) auth
 */
export async function getCurrentUser(request?: NextRequest): Promise<AuthUser | null> {
  // Method 1: Try NextAuth session (legacy)
  try {
    const session = await getServerSession(authOptions)
    if (session?.user) {
      return {
        id: (session.user as any).id,
        name: session.user.name,
        username: (session.user as any).username,
        role: (session.user as any).role,
        companyId: (session.user as any).companyId,
        companyRole: (session.user as any).companyRole,
        tenantId: (session.user as any).tenantId || null,
      }
    }
  } catch (e) {
    // Session lookup failed, try token
  }

  // Method 2: Try access token from header (tenant-aware)
  if (request) {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '') || request.headers.get('X-Auth-Token')

    if (token) {
      // Try to get tenant ID from headers
      const tenantId = request.headers.get('X-Tenant-Id')

      if (tenantId) {
        // New flow: Look up token in tenant-specific DB
        try {
          const tenantDb = await getTenantDb(tenantId)

          const accessToken = await tenantDb.accessToken.findUnique({
            where: { token },
            include: {
              user: {
                include: {
                  companyUsers: {
                    where: { isActive: true },
                    select: { companyId: true, role: true },
                    take: 1,
                  },
                },
              },
            },
          })

          if (accessToken && accessToken.expiresAt > new Date() && accessToken.user.isActive) {
            const user = accessToken.user
            const primaryCompany = user.companyUsers[0]
            return {
              id: user.id,
              name: user.name,
              username: user.username,
              role: user.role,
              companyId: primaryCompany?.companyId || null,
              companyRole: primaryCompany?.role || null,
              tenantId,
            }
          }
        } catch (e) {
          // Tenant DB lookup failed, try platform DB fallback
        }
      }

      // Fallback: Try platform DB (for legacy users without tenant context)
      const accessToken = await db.accessToken.findUnique({
        where: { token },
        include: {
          user: {
            include: {
              companyUsers: {
                where: { isActive: true },
                select: { companyId: true, role: true },
                take: 1,
              },
            },
          },
        },
      })

      if (accessToken && accessToken.expiresAt > new Date() && accessToken.user.isActive) {
        const user = accessToken.user
        const primaryCompany = user.companyUsers[0]

        // Try to resolve tenantId from company
        let userTenantId: string | null = null
        if (primaryCompany?.companyId) {
          const company = await db.company.findUnique({
            where: { id: primaryCompany.companyId },
            select: { tenantId: true },
          })
          userTenantId = company?.tenantId || null
        }

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          companyId: primaryCompany?.companyId || null,
          companyRole: primaryCompany?.role || null,
          tenantId: userTenantId,
        }
      }
    }
  }

  return null
}

export async function requireAuth(request?: NextRequest): Promise<AuthUser> {
  const user = await getCurrentUser(request)
  if (!user) {
    // Dev mode: auto-login as admin (legacy fallback for development only)
    if (process.env.NODE_ENV === 'development') {
      const adminUser = await db.user.findUnique({
        where: { username: 'admin' },
        include: {
          companyUsers: {
            where: { isActive: true },
            select: { companyId: true, role: true },
            take: 1,
          },
        },
      })
      if (adminUser) {
        const primaryCompany = adminUser.companyUsers[0]
        let devTenantId: string | null = null
        if (primaryCompany?.companyId) {
          const company = await db.company.findUnique({
            where: { id: primaryCompany.companyId },
            select: { tenantId: true },
          })
          devTenantId = company?.tenantId || null
        }
        return {
          id: adminUser.id,
          name: adminUser.name,
          username: adminUser.username,
          role: adminUser.role,
          companyId: primaryCompany?.companyId || null,
          companyRole: primaryCompany?.role || null,
          tenantId: devTenantId,
        }
      }
    }
    throw new Error('غير مصرح بالدخول')
  }

  // ── License check (using platform DB) ──
  if (user.tenantId) {
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      include: {
        licenses: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (tenant) {
      if (tenant.status === 'suspended') {
        throw new Error('حسابك معلق. يرجى التواصل مع إدارة المنصة')
      }
      if (tenant.status === 'cancelled') {
        throw new Error('حسابك ملغي. يرجى التواصل مع إدارة المنصة')
      }

      const license = tenant.licenses[0]
      if (!license) {
        throw new Error('لا يوجد ترخيص نشط. يرجى التواصل مع إدارة المنصة')
      }

      if (!license.isLifetime && license.expiresAt < new Date()) {
        throw new Error('انتهت صلاحية الترخيص. يرجى التجديد للمتابعة')
      }
    }
  }

  return user
}

export async function requirePermission(permission: Permission, request?: NextRequest): Promise<AuthUser> {
  const user = await requireAuth(request)
  if (!hasPermission(user.role, permission)) {
    throw new Error('ليس لديك صلاحية لهذا الإجراء')
  }
  return user
}

export async function requireAdmin(request?: NextRequest): Promise<AuthUser> {
  const user = await requireAuth(request)
  if (user.role !== 'super_admin' && user.role !== 'admin') {
    throw new Error('هذا الإجراء يتطلب صلاحيات المسؤول')
  }
  return user
}

/**
 * Check if a user with a given creator role can assign a specific target role.
 */
export function canAssignRole(creatorRole: string, targetRole: string): boolean {
  if (creatorRole === 'super_admin') return true
  if (creatorRole === 'admin') {
    return ['accountant', 'sales', 'purchase', 'inventory', 'viewer'].includes(targetRole)
  }
  return false
}

/**
 * Get the list of roles that a creator can assign based on their role.
 */
export function getAssignableRoles(creatorRole: string): string[] {
  if (creatorRole === 'super_admin') {
    return ['super_admin', 'admin', 'accountant', 'sales', 'purchase', 'inventory', 'viewer']
  }
  if (creatorRole === 'admin') {
    return ['accountant', 'sales', 'purchase', 'inventory', 'viewer']
  }
  return []
}

/**
 * Get the tenant-specific PrismaClient for an authenticated user
 * This is the main function ERP routes should use
 */
export async function getTenantDbForUser(request: NextRequest) {
  const user = await requireAuth(request)

  if (!user.tenantId) {
    throw new Error('لم يتم تحديد المستأجر لهذا المستخدم')
  }

  const tenantDb = await getTenantDb(user.tenantId)
  return { user, tenantDb, tenantId: user.tenantId }
}
