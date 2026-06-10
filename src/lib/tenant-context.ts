import { NextRequest } from 'next/server'
import { getTenantDb, getTenantDbBySubdomain, getTenantDbByDomain } from '@/lib/tenant-db'
import { PrismaClient } from '@prisma/client'

// ─────────────────────────────────────────────────────────
// Tenant Context
// Resolves which tenant a request belongs to based on
// subdomain, custom domain, or header
// ─────────────────────────────────────────────────────────

export interface TenantContext {
  tenantId: string
  subdomain: string
  customDomain?: string
  prisma: PrismaClient
}

/**
 * Extract subdomain from a hostname
 * e.g., "acme.ctrlerp.com" → "acme"
 * e.g., "acme.localhost" → "acme"
 */
function extractSubdomain(hostname: string): string | null {
  if (!hostname) return null

  // Handle localhost with subdomain (e.g., acme.localhost:3000)
  if (hostname.includes('.localhost')) {
    const parts = hostname.split('.localhost')
    if (parts[0] && parts[0] !== 'www') {
      return parts[0].toLowerCase()
    }
    return null
  }

  // Handle IP addresses - no subdomain
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null
  }

  // Handle custom domain patterns
  const parts = hostname.split('.')

  // Single word = no subdomain (e.g., "localhost")
  if (parts.length <= 1) return null

  // Two parts could be: "ctrlerp.com" (no subdomain) or "acme.localhost" (subdomain)
  if (parts.length === 2) {
    // If it's a known TLD pattern, no subdomain
    if (['com', 'io', 'dev', 'app', 'org', 'net'].includes(parts[1])) {
      return null
    }
    // Otherwise treat first part as subdomain (for dev)
    return parts[0].toLowerCase()
  }

  // Three+ parts: "acme.ctrlerp.com" → "acme"
  // But skip "www"
  const subdomain = parts[0].toLowerCase()
  if (subdomain === 'www') return null

  return subdomain
}

/**
 * Known platform subdomains that should NOT be treated as tenant subdomains
 */
const PLATFORM_SUBDOMAINS = new Set([
  'admin',
  'api',
  'www',
  'app',
  'platform',
  'mail',
  'ftp',
  'cdn',
  'static',
])

/**
 * Resolve tenant context from a request
 * Priority: X-Tenant-Id header > custom domain > subdomain
 */
export async function resolveTenantContext(request: NextRequest): Promise<TenantContext | null> {
  // Method 1: Explicit tenant ID header (used by internal API calls)
  const tenantIdHeader = request.headers.get('X-Tenant-Id')
  if (tenantIdHeader) {
    try {
      const prisma = await getTenantDb(tenantIdHeader)
      return {
        tenantId: tenantIdHeader,
        subdomain: '', // resolved from DB
        prisma,
      }
    } catch {
      return null
    }
  }

  // Method 2: Resolve from hostname (subdomain or custom domain)
  const hostname = request.headers.get('host')?.split(':')[0] || ''

  // Check for custom domain first (full domain match)
  if (hostname && !hostname.includes('.localhost') && !hostname.includes('127.0.0.1')) {
    const domainResult = await getTenantDbByDomain(hostname)
    if (domainResult) {
      return {
        tenantId: domainResult.tenantId,
        subdomain: '', // custom domain doesn't need subdomain
        customDomain: hostname,
        prisma: domainResult.prisma,
      }
    }
  }

  // Method 3: Resolve from subdomain
  const subdomain = extractSubdomain(hostname)

  if (!subdomain || PLATFORM_SUBDOMAINS.has(subdomain)) {
    // No tenant context - this is a platform-level request
    return null
  }

  const subdomainResult = await getTenantDbBySubdomain(subdomain)
  if (subdomainResult) {
    return {
      tenantId: subdomainResult.tenantId,
      subdomain,
      prisma: subdomainResult.prisma,
    }
  }

  return null
}

/**
 * Get the base platform domain (for admin, landing page, etc.)
 */
export function isPlatformRequest(request: NextRequest): boolean {
  const hostname = request.headers.get('host')?.split(':')[0] || ''
  const subdomain = extractSubdomain(hostname)

  if (!subdomain) return true
  if (PLATFORM_SUBDOMAINS.has(subdomain)) return true

  return false
}
