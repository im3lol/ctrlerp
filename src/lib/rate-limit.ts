/**
 * Simple in-memory rate limiter.
 * For production with multiple instances, use Redis-based rate limiting.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
  blocked: boolean
  blockedUntil: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now && !entry.blocked) {
      rateLimitStore.delete(key)
    }
    if (entry.blocked && entry.blockedUntil < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000).unref()

export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number
  /** Max requests per window */
  maxRequests: number
  /** Block duration in milliseconds after exceeding limit (default: windowMs * 2) */
  blockDurationMs?: number
}

// Preset configurations
export const RATE_LIMITS = {
  // Login attempts: 5 per minute, then block for 15 minutes
  LOGIN: { windowMs: 60_000, maxRequests: 5, blockDurationMs: 15 * 60_000 },
  // Admin login: 3 per minute, then block for 30 minutes
  ADMIN_LOGIN: { windowMs: 60_000, maxRequests: 3, blockDurationMs: 30 * 60_000 },
  // General API: 60 per minute
  API: { windowMs: 60_000, maxRequests: 60, blockDurationMs: 60_000 },
  // License activation: 3 per minute
  LICENSE_ACTIVATE: { windowMs: 60_000, maxRequests: 3, blockDurationMs: 10 * 60_000 },
  // Password reset: 3 per hour
  PASSWORD_RESET: { windowMs: 60 * 60_000, maxRequests: 3, blockDurationMs: 60 * 60_000 },
} as const

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfter?: number // ms until unblocked
}

/**
 * Check if a request should be rate limited
 * @param key - Unique identifier (e.g., IP address + route)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  // No previous entry - allow and start counting
  if (!entry || entry.resetAt < now) {
    const resetAt = now + config.windowMs
    rateLimitStore.set(key, { count: 1, resetAt, blocked: false, blockedUntil: 0 })
    return { allowed: true, remaining: config.maxRequests - 1, resetAt }
  }

  // Currently blocked
  if (entry.blocked && entry.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: entry.blockedUntil - now,
    }
  }

  // Block period expired - reset
  if (entry.blocked && entry.blockedUntil <= now) {
    const resetAt = now + config.windowMs
    rateLimitStore.set(key, { count: 1, resetAt, blocked: false, blockedUntil: 0 })
    return { allowed: true, remaining: config.maxRequests - 1, resetAt }
  }

  // Within window - increment count
  entry.count++

  if (entry.count > config.maxRequests) {
    // Exceeded limit - block
    const blockDuration = config.blockDurationMs || config.windowMs * 2
    entry.blocked = true
    entry.blockedUntil = now + blockDuration
    rateLimitStore.set(key, entry)

    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: blockDuration,
    }
  }

  rateLimitStore.set(key, entry)
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt }
}

/**
 * Get client identifier for rate limiting
 * Uses IP address from request headers
 */
export function getClientId(request: Request, suffix?: string): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown'
  return suffix ? `${ip}:${suffix}` : ip
}

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(result: RateLimitResult, config: RateLimitConfig): Record<string, string> {
  return {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
    ...(result.retryAfter ? { 'Retry-After': Math.ceil(result.retryAfter / 1000).toString() } : {}),
  }
}
