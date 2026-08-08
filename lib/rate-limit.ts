const buckets = new Map<string, { count: number; resetAt: number }>()

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfter: number
}

export function checkRateLimit(key: string, limit = 10, windowMs = 60_000): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    const nextBucket = { count: 1, resetAt: now + windowMs }
    buckets.set(key, nextBucket)
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt: nextBucket.resetAt, retryAfter: 0 }
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }

  bucket.count += 1
  return { allowed: true, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt, retryAfter: 0 }
}

export function clearRateLimit(key: string) {
  buckets.delete(key)
}
