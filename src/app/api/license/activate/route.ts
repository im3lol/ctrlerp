import { NextRequest, NextResponse } from 'next/server'
import { activateLicense } from '@/lib/license-enforcement'
import { db } from '@/lib/db'
import { getTenantDb } from '@/lib/tenant-db'

// POST: Activate a license key
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { checkRateLimit, RATE_LIMITS, getClientId, rateLimitHeaders } = await import('@/lib/rate-limit')
    const clientId = getClientId(request, 'license-activate')
    const rateLimit = checkRateLimit(clientId, RATE_LIMITS.LICENSE_ACTIVATE)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `تم تجاوز عدد المحاولات المسموحة. يرجى المحاولة بعد ${Math.ceil((rateLimit.retryAfter || 60000) / 1000 / 60)} دقيقة` },
        {
          status: 429,
          headers: rateLimitHeaders(rateLimit, RATE_LIMITS.LICENSE_ACTIVATE),
        }
      )
    }

    const body = await request.json()
    const { licenseKey, tenantId, subdomain } = body

    if (!licenseKey) {
      return NextResponse.json({ error: 'مفتاح الترخيص مطلوب' }, { status: 400 })
    }

    // Resolve tenant DB
    let resolvedTenantId = tenantId

    if (!resolvedTenantId && subdomain) {
      const tenant = await db.tenant.findUnique({ where: { subdomain } })
      if (!tenant) {
        return NextResponse.json({ error: 'المستأجر غير موجود' }, { status: 404 })
      }
      resolvedTenantId = tenant.id
    }

    // Try to find tenant from custom domain or subdomain header
    if (!resolvedTenantId) {
      const hostname = request.headers.get('host')?.split(':')[0] || ''
      // Try custom domain
      const tenantByDomain = await db.tenant.findUnique({ where: { customDomain: hostname } })
      if (tenantByDomain) {
        resolvedTenantId = tenantByDomain.id
      } else {
        // Try subdomain extraction
        const parts = hostname.split('.')
        if (parts.length > 1) {
          const sub = parts[0].toLowerCase()
          const tenantBySub = await db.tenant.findUnique({ where: { subdomain: sub } })
          if (tenantBySub) resolvedTenantId = tenantBySub.id
        }
      }
    }

    if (!resolvedTenantId) {
      return NextResponse.json({ error: 'لم يتم تحديد المستأجر' }, { status: 400 })
    }

    const tenantDb = await getTenantDb(resolvedTenantId)

    const result = await activateLicense(tenantDb, licenseKey)

    if (result.success) {
      const response = NextResponse.json({
        message: 'تم تفعيل الترخيص بنجاح',
        status: result.status,
      })
      response.cookies.set('license_valid', 'true', {
        path: '/',
        httpOnly: false,
        maxAge: 3600, // 1 hour
        sameSite: 'lax',
      })
      return response
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
  } catch (error) {
    console.error('License activation error:', error)
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
