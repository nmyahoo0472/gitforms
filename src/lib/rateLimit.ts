interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter: number // seconds until reset
}

const store = new Map<string, RateLimitEntry>()

const LIMIT = 3
const WINDOW_MS = 60_000 // 60 seconds

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now()
  const entry = store.get(ip)

  // Expired or first request
  if (!entry || now >= entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: LIMIT - 1, retryAfter: 0 }
  }

  // Within window — under limit
  if (entry.count < LIMIT) {
    entry.count++
    return {
      allowed: true,
      remaining: LIMIT - entry.count,
      retryAfter: 0,
    }
  }

  // Blocked
  return {
    allowed: false,
    remaining: 0,
    retryAfter: Math.ceil((entry.resetAt - now) / 1000),
  }
}

// Periodic cleanup to prevent unbounded Map growth
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of store.entries()) {
    if (now >= entry.resetAt) {
      store.delete(ip)
    }
  }
}, WINDOW_MS)
