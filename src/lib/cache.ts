/**
 * Simple in-memory cache with TTL support.
 * Used to avoid repeated expensive database queries on every request.
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of cache) {
    if (entry.expiresAt < now) {
      cache.delete(key)
    }
  }
}, 5 * 60 * 1000)

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

export function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  })
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
    }
  }
}

/**
 * Get data from cache or compute and cache it.
 * @param key Cache key
 * @param ttlMs Time to live in milliseconds
 * @param compute Function to compute the data if not cached
 */
export async function cached<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
  const cachedData = getCached<T>(key)
  if (cachedData !== null) return cachedData

  const data = await compute()
  setCache(key, data, ttlMs)
  return data
}

// Cache TTL presets
export const CACHE_TTL = {
  DASHBOARD_STATS: 30_000,     // 30 seconds - dashboard overview
  ANALYTICS: 60_000,           // 1 minute - analytics page
  REVENUE: 60_000,             // 1 minute - revenue data
  SYSTEM_HEALTH: 15_000,       // 15 seconds - system health checks
  TENANTS_LIST: 30_000,        // 30 seconds - tenant listing
  LICENSES_LIST: 30_000,       // 30 seconds - license listing
  ACTIVITY_LOGS: 15_000,       // 15 seconds - activity logs
  ADMIN_AUTH: 60_000,          // 1 minute - admin auth tokens
}
