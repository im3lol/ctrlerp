import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Apply security headers to all responses
 * These headers protect against common web vulnerabilities
 */
export function applySecurityHeaders(response: NextResponse, request?: NextRequest): NextResponse {
  // Prevent clickjacking - only allow framing from same origin
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Enable XSS protection in older browsers
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Content Security Policy - allow necessary resources
  // This is a permissive CSP for development; tighten for production
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Next.js requires unsafe-inline and unsafe-eval
    "style-src 'self' 'unsafe-inline'",  // Tailwind requires unsafe-inline
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",  // API connections
    "frame-ancestors 'self'",  // Prevent clickjacking
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)

  // Permissions Policy - limit browser features
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Strict Transport Security (only in production with HTTPS)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  return response
}
