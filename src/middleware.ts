import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────
// Multi-tenant Middleware
// Routes requests to the correct tenant based on subdomain/domain
// ─────────────────────────────────────────────────────────

// Platform routes that are NOT tenant-specific
const PLATFORM_ROUTES = new Set([
  '/admin',
  '/api/admin',
  '/api/license',
  '/sign-in',
  '/sign-up',
  '/login',
])

/**
 * Check if a path is a platform-level route
 */
function isPlatformPath(pathname: string): boolean {
  for (const route of PLATFORM_ROUTES) {
    if (pathname.startsWith(route)) return true
  }
  return false
}

/**
 * Known platform subdomains
 */
const PLATFORM_SUBDOMAINS = new Set([
  'admin',
  'api',
  'www',
  'app',
  'platform',
  'mail',
  'cdn',
  'static',
])

/**
 * Extract subdomain from hostname
 */
function extractSubdomain(hostname: string): string | null {
  if (!hostname) return null

  // Handle localhost with subdomain
  if (hostname.includes('.localhost')) {
    const parts = hostname.split('.localhost')
    if (parts[0] && !PLATFORM_SUBDOMAINS.has(parts[0].toLowerCase())) {
      return parts[0].toLowerCase()
    }
    return null
  }

  // IP address = no subdomain
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null

  const parts = hostname.split('.')
  if (parts.length <= 1) return null
  if (parts.length === 2) {
    if (['com', 'io', 'dev', 'app', 'org', 'net'].includes(parts[1])) return null
    return parts[0].toLowerCase()
  }

  const subdomain = parts[0].toLowerCase()
  if (subdomain === 'www') return null
  if (PLATFORM_SUBDOMAINS.has(subdomain)) return null

  return subdomain
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host')?.split(':')[0] || ''

  // ── Platform routes (admin, auth) always pass through ──
  if (isPlatformPath(pathname)) {
    return NextResponse.next()
  }

  // ── Static files, _next, etc. pass through ──
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/uploads') ||
    pathname.includes('.') // File extensions (images, etc.)
  ) {
    return NextResponse.next()
  }

  // ── Extract subdomain ──
  const subdomain = extractSubdomain(hostname)

  if (!subdomain) {
    // No subdomain = platform landing page or direct access
    // For /app route without tenant context, redirect to platform
    if (pathname.startsWith('/app')) {
      // This could be a legacy request without subdomain
      // Let it through - the auth system will handle it
      return NextResponse.next()
    }
    return NextResponse.next()
  }

  // ── Tenant-specific request ──
  // Add X-Tenant-Subdomain header so API routes can use it
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('X-Tenant-Subdomain', subdomain)

  // For the /app route, we serve the same app but with tenant context
  if (pathname.startsWith('/app') || pathname.startsWith('/api/')) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // For root path on a tenant subdomain, redirect to /app
  if (pathname === '/' || pathname === '') {
    const url = request.nextUrl.clone()
    url.pathname = '/app'
    return NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)',
  ],
}
