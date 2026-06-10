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
      return NextResponse.json({
        locked: true,
        active: false,
        reason: 'NO_TENANT',
      })
    }

    const tenantDb = await getTenantDb(resolvedTenantId)
    const status = await checkLicenseValid(tenantDb, resolvedTenantId)

    return NextResponse.json(status)
  } catch (error) {
    console.error('License status error:', error)
    return NextResponse.json({
      locked: true,
      active: false,
      reason: 'VERIFICATION_ERROR',
    }, { status: 500 })
  }
}
