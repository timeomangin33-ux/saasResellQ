/**
 * Rate Limiting
 * Simple in-memory rate limiter for API endpoints
 * For production with multiple servers, upgrade to Redis-based solution
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

/**
 * Rate limit configuration
 */
export const RATE_LIMITS = {
  api: { requests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  auth: { requests: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  webhook: { requests: 1000, windowMs: 60 * 1000 }, // 1000 requests per minute
}

type RateLimitKey = keyof typeof RATE_LIMITS

/**
 * Check if request is rate limited
 * 
 * Usage:
 * import { checkRateLimit } from '@/lib/rateLimit'
 * import { NextRequest, NextResponse } from 'next/server'
 * 
 * export async function POST(req: NextRequest) {
 *   const ip = req.headers.get('x-forwarded-for') || 'unknown'
 *   const limited = checkRateLimit(ip, 'auth')
 *   
 *   if (limited) {
 *     return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 *   }
 *   
 *   // ... handle request
 * }
 */
export function checkRateLimit(key: string, limitType: RateLimitKey = 'api'): boolean {
  const config = RATE_LIMITS[limitType]
  const now = Date.now()

  const entry = rateLimitMap.get(key)

  // Clean up old entries periodically
  if (entry && now > entry.resetTime) {
    rateLimitMap.delete(key)
    return false
  }

  // Create new entry
  if (!entry) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    return false
  }

  // Increment counter
  entry.count++

  // Check if limit exceeded
  return entry.count > config.requests
}

/**
 * Get remaining requests for a key
 */
export function getRateLimitInfo(key: string, limitType: RateLimitKey = 'api') {
  const config = RATE_LIMITS[limitType]
  const entry = rateLimitMap.get(key)

  if (!entry || Date.now() > entry.resetTime) {
    return {
      remaining: config.requests,
      resetTime: Date.now() + config.windowMs,
    }
  }

  return {
    remaining: Math.max(0, config.requests - entry.count),
    resetTime: entry.resetTime,
  }
}

/**
 * Clear rate limit for a key (admin use)
 */
export function clearRateLimit(key: string) {
  rateLimitMap.delete(key)
}

/**
 * Clear all rate limits (admin/cleanup)
 */
export function clearAllRateLimits() {
  rateLimitMap.clear()
}
