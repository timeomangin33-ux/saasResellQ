/**
 * Retry Logic with Exponential Backoff
 * For resilient external API calls
 */

export interface RetryOptions {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
}

/**
 * Sleep for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  const exponentialDelay = initialDelay * Math.pow(multiplier, attempt)
  return Math.min(exponentialDelay, maxDelay)
}

/**
 * Retry a function with exponential backoff
 * 
 * Usage:
 * import { retryWithBackoff } from '@/lib/retry'
 * 
 * const data = await retryWithBackoff(
 *   () => fetch('https://api.vinted.com/products'),
 *   { maxRetries: 3 }
 * )
 * 
 * With custom error handling:
 * const data = await retryWithBackoff(
 *   async () => {
 *     const res = await fetch('...')
 *     if (!res.ok) throw new Error(res.statusText)
 *     return res.json()
 *   },
 *   { maxRetries: 5, initialDelayMs: 200 }
 * )
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don\'t retry on last attempt
      if (attempt === config.maxRetries) {
        break
      }

      // Calculate delay with exponential backoff
      const delayMs = getBackoffDelay(
        attempt,
        config.initialDelayMs,
        config.maxDelayMs,
        config.backoffMultiplier
      )

      console.warn(
        `Attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delayMs}ms...`
      )

      await delay(delayMs)
    }
  }

  throw lastError || new Error('Max retries exceeded')
}

/**
 * Retry with specific status code handling
 */
export async function retryWithStatusCodes<T>(
  fn: () => Promise<T>,
  retryableStatusCodes: number[] = [408, 429, 500, 502, 503, 504],
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const httpError = error as any
      const statusCode = httpError?.status || httpError?.statusCode

      // Check if this is a retryable error
      const isRetryable = statusCode && retryableStatusCodes.includes(statusCode)
      if (!isRetryable && attempt > 0) {
        throw error
      }

      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt === config.maxRetries) {
        break
      }

      const delayMs = getBackoffDelay(
        attempt,
        config.initialDelayMs,
        config.maxDelayMs,
        config.backoffMultiplier
      )

      console.warn(
        `Attempt ${attempt + 1} failed (status: ${statusCode}). Retrying in ${delayMs}ms...`
      )

      await delay(delayMs)
    }
  }

  throw lastError || new Error('Max retries exceeded')
}
