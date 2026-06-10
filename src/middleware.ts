import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────
// Multi-tenant Middleware with Strict License Enforcement
// Routes requests to the correct tenant based on subdomain/domain
// Enforces license checks - system is LOCKED without valid license
// ─────────────────────────────────────────────────────────

// Platform routes that are NOT tenant-specific
const PLATFORM_ROUTES = new Set([
  '/admin',
  '/api/admin',
  '/api/license',
  '/sign-in',
  '/sign-up',
  '/login',
  '/register',
])

// Routes that should be accessible even without a license (locked system)
const LICENSE_FREE_ROUTES = new Set([
  '/license-activate',
  '/api/license',
  '/login',
  '/register',
])

// Static/asset paths that should always pass through
const STATIC_PATHS = ['/_next', '/fonts', '/uploads', '/favicon', '/robots', '/sitemap']

function isPlatformPath(pathname: string): boolean {
  for (const route of PLATFORM_ROUTES) {
    if (pathname.startsWith(route)) return true
  }
  return false
}

function isLicenseFreePath(pathname: string): boolean {
  for (const route of LICENSE_FREE_ROUTES) {
    if (pathname.startsWith(route)) return true
  }
  return false
}

function isStaticPath(pathname: string): boolean {
  for (const path of STATIC_PATHS) {
    if (pathname.startsWith(path)) return true
  }
  // Files with extensions (images, CSS, JS, etc.)
  if (pathname.includes('.') && !pathname.endsWith('/')) return true
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

/**
 * Apply security headers to a response
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking - only allow framing from same origin
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Enable XSS protection in older browsers
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions Policy - limit browser features
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Strict Transport Security (only in production with HTTPS)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  return response
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host')?.split(':')[0] || ''

  // ── Platform routes always pass through ──
  if (isPlatformPath(pathname)) {
    const response = NextResponse.next()
    return applySecurityHeaders(response)
  }

  // ── License-free routes always pass through ──
  if (isLicenseFreePath(pathname)) {
    const response = NextResponse.next()
    return applySecurityHeaders(response)
  }

  // ── Static files, _next, etc. pass through ──
  if (isStaticPath(pathname)) {
    const response = NextResponse.next()
    return applySecurityHeaders(response)
  }

  // ── Extract subdomain ──
  const subdomain = extractSubdomain(hostname)

  // ── LICENSE ENFORCEMENT ──
  // Check if the system has a valid license cookie
  // This cookie is set by /api/license/status endpoint
  const licenseCookie = request.cookies.get('license_valid')?.value

  // For tenant-specific routes (has subdomain), enforce license
  if (subdomain) {
    // Check license status from cookie
    if (licenseCookie !== 'true') {
      // No valid license - redirect to activation page
      // But allow the activation page and its API to work
      if (!pathname.startsWith('/license-activate') && !pathname.startsWith('/api/license')) {
        const url = request.nextUrl.clone()
        url.pathname = '/license-activate'
        url.searchParams.set('redirect', pathname)
        return NextResponse.redirect(url)
      }
    }
  }

  // For /app routes without subdomain (self-hosted single-tenant)
  if (pathname.startsWith('/app')) {
    if (licenseCookie !== 'true') {
      if (!pathname.startsWith('/license-activate') && !pathname.startsWith('/api/license')) {
        const url = request.nextUrl.clone()
        url.pathname = '/license-activate'
        url.searchParams.set('redirect', pathname)
        return NextResponse.redirect(url)
      }
    }
  }

  // ── Tenant-specific request ──
  const requestHeaders = new Headers(request.headers)
  if (subdomain) {
    requestHeaders.set('X-Tenant-Subdomain', subdomain)
  }

  // For tenant routes, pass through with tenant context headers
  if (pathname.startsWith('/app') || pathname.startsWith('/api/')) {
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    return applySecurityHeaders(response)
  }

  // For root path on a tenant subdomain, redirect to /app
  if (pathname === '/' || pathname === '') {
    const url = request.nextUrl.clone()
    url.pathname = '/app'
    const response = NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    })
    return applySecurityHeaders(response)
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  return applySecurityHeaders(response)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)',
  ],
}
