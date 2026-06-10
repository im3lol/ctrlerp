import { NextRequest, NextResponse } from 'next/server'
import { checkLicenseValid } from '@/lib/license-enforcement'
import { db } from '@/lib/db'
import { getTenantDb } from '@/lib/tenant-db'

// GET: Check current license status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const subdomain = searchParams.get('subdomain')

    let resolvedTenantId = tenantId

    if (!resolvedTenantId && subdomain) {
      const tenant = await db.tenant.findUnique({ where: { subdomain } })
      if (tenant) resolvedTenantId = tenant.id
    }

    // Try from headers
    if (!resolvedTenantId) {
      resolvedTenantId = request.headers.get('X-Tenant-Id') || undefined
    }

    if (!resolvedTenantId) {
      // Check from hostname
      const hostname = request.headers.get('host')?.split(':')[0] || ''
      const tenantByDomain = await db.tenant.findUnique({ where: { customDomain: hostname } })
      if (tenantByDomain) {
        resolvedTenantId = tenantByDomain.id
      } else {
        const parts = hostname.split('.')
        if (parts.length > 1) {
          const sub = parts[0].toLowerCase()
          const tenantBySub = await db.tenant.findUnique({ where: { subdomain: sub } })
          if (tenantBySub) resolvedTenantId = tenantBySub.id
        }
      }
    }

    if (!resolvedTenantId) {
      const response = NextResponse.json({
        locked: true,
        active: false,
        reason: 'NO_TENANT',
      })
      response.cookies.set('license_valid', 'false', {
        path: '/',
        httpOnly: false,
        maxAge: 300, // 5 min
        sameSite: 'lax',
      })
      return response
    }

    const tenantDb = await getTenantDb(resolvedTenantId)
    const status = await checkLicenseValid(tenantDb, resolvedTenantId)

    const response = NextResponse.json(status)

    // Set license cookie for middleware to check
    response.cookies.set('license_valid', status.active && !status.locked ? 'true' : 'false', {
      path: '/',
      httpOnly: false,
      maxAge: status.active ? 3600 : 300, // 1 hour if valid, 5 min if not
      sameSite: 'lax',
    })

    return response
  } catch (error) {
    console.error('License status error:', error)
    const response = NextResponse.json({
      locked: true,
      active: false,
      reason: 'VERIFICATION_ERROR',
    }, { status: 500 })
    response.cookies.set('license_valid', 'false', { path: '/', httpOnly: false, maxAge: 300, sameSite: 'lax' })
    return response
  }
}
