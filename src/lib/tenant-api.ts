import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { db } from '@/lib/db'
import { getTenantDb, getTenantDbBySubdomain } from '@/lib/tenant-db'

// ─────────────────────────────────────────────────────────
// Tenant API Helper
// Simplifies accessing tenant-specific DB in ERP API routes
// ─────────────────────────────────────────────────────────

export interface TenantApiContext {
  tenantId: string
  tenantDb: PrismaClient
  userId: string
  username: string
  userRole: string
  companyId: string | null
  companyRole: string | null
}

/**
 * Resolve tenant and authenticate user for ERP API routes
 * This replaces the old requireAuth() with multi-DB awareness
 *
 * Flow:
 * 1. Get auth token from header
 * 2. Resolve tenant from X-Tenant-Id or X-Tenant-Subdomain header
 * 3. Look up token in tenant's database
 * 4. Return tenant-specific PrismaClient + user context
 */
export async function getTenantApiContext(request: NextRequest): Promise<TenantApiContext> {
  // ── Step 1: Get auth token ──
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '') || request.headers.get('X-Auth-Token')

  if (!token) {
    throw new Error('غير مصرح بالدخول')
  }

  // ── Step 2: Resolve tenant ──
  const tenantIdHeader = request.headers.get('X-Tenant-Id')
  const subdomainHeader = request.headers.get('X-Tenant-Subdomain')

  let tenantId: string | null = tenantIdHeader
  let tenantDb: PrismaClient

  // Try resolving from subdomain if no explicit tenant ID
  if (!tenantId && subdomainHeader) {
    const tenantResult = await getTenantDbBySubdomain(subdomainHeader)
    if (tenantResult) {
      tenantId = tenantResult.tenantId
      tenantDb = tenantResult.prisma
    } else {
      throw new Error('المستأجر غير موجود أو غير نشط')
    }
  }

  if (!tenantId) {
    // Fallback: try to find which tenant DB has this token
    // This is slow but needed for backward compatibility
    // First check platform DB for tenant list
    const tenants = await db.tenant.findMany({
      where: { status: 'active', dbStatus: 'ready' },
      select: { id: true },
    })

    let found = false
    for (const t of tenants) {
      try {
        const tDb = await getTenantDb(t.id)
        const accessToken = await tDb.accessToken.findUnique({
          where: { token },
          select: { userId: true, expiresAt: true },
        })
        if (accessToken && accessToken.expiresAt > new Date()) {
          tenantId = t.id
          tenantDb = tDb
          found = true
          break
        }
      } catch {
        // Continue to next tenant
      }
    }

    if (!found) {
      throw new Error('غير مصرح بالدخول')
    }
  } else {
    tenantDb = await getTenantDb(tenantId)
  }

  // ── Step 3: Validate token in tenant DB ──
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

  if (!accessToken || accessToken.expiresAt < new Date() || !accessToken.user.isActive) {
    throw new Error('غير مصرح بالدخول')
  }

  // ── Step 4: Check license in platform DB ──
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { status: true },
  })

  if (tenant?.status === 'suspended') {
    throw new Error('حسابك معلق. يرجى التواصل مع إدارة المنصة')
  }
  if (tenant?.status === 'cancelled') {
    throw new Error('حسابك ملغي. يرجى التواصل مع إدارة المنصة')
  }

  const user = accessToken.user
  const primaryCompany = user.companyUsers[0]

  return {
    tenantId,
    tenantDb,
    userId: user.id,
    username: user.username,
    userRole: user.role,
    companyId: primaryCompany?.companyId || null,
    companyRole: primaryCompany?.role || null,
  }
}

/**
 * Wrapper for ERP API route handlers that need tenant context
 * Automatically resolves tenant DB and authenticates user
 */
export function withTenantApi(
  handler: (ctx: TenantApiContext, request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const ctx = await getTenantApiContext(request)
      return await handler(ctx, request)
    } catch (error) {
      console.error('Tenant API error:', error)
      const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
      const status = message.includes('غير مصرح') ? 401 :
                     message.includes('معلق') || message.includes('ملغي') ? 403 :
                     message.includes('غير موجود') ? 404 : 500
      return NextResponse.json({ error: message }, { status })
    }
  }
}
