/**
 * Circuit Breaker Pattern
 * For resilient handling of external service failures
 */

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerConfig {
  failureThreshold?: number // Number of failures before opening circuit
  successThreshold?: number // Number of successes before closing circuit
  timeout?: number // Time in ms before attempting recovery (ms)
}

interface CircuitBreakerStatus {
  state: CircuitBreakerState
  failureCount: number
  lastFailureTime?: number
  successCount: number
}

const DEFAULT_CONFIG: Required<CircuitBreakerConfig> = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000, // 1 minute
}

const circuitBreakers = new Map<string, CircuitBreakerStatus>()

/**
 * Circuit Breaker States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests blocked immediately
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 */

/**
 * Execute a function with circuit breaker protection
 * 
 * Usage:
 * import { executeWithCircuitBreaker } from '@/lib/circuitBreaker'
 * 
 * const data = await executeWithCircuitBreaker(
 *   'vinted-api',
 *   () => fetch('https://api.vinted.com/products'),
 *   { failureThreshold: 3, timeout: 30000 }
 * )
 */
export async function executeWithCircuitBreaker<T>(
  serviceName: string,
  fn: () => Promise<T>,
  config: CircuitBreakerConfig = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  let status = circuitBreakers.get(serviceName)

  if (!status) {
    status = {
      state: 'CLOSED',
      failureCount: 0,
      successCount: 0,
    }
    circuitBreakers.set(serviceName, status)
  }

  // OPEN state - immediately reject
  if (status.state === 'OPEN') {
    const timeSinceLastFailure = Date.now() - (status.lastFailureTime || 0)
    
    if (timeSinceLastFailure < finalConfig.timeout) {
      throw new Error(
        `Circuit breaker is OPEN for ${serviceName}. Service unavailable. Retry in ${finalConfig.timeout - timeSinceLastFailure}ms`
      )
    }
    
    // Transition to HALF_OPEN
    console.log(`[Circuit Breaker] ${serviceName} transitioning to HALF_OPEN`)
    status.state = 'HALF_OPEN'
    status.successCount = 0
  }

  try {
    const result = await fn()
    
    // Success
    if (status.state === 'HALF_OPEN') {
      status.successCount++
      
      if (status.successCount >= finalConfig.successThreshold) {
        console.log(`[Circuit Breaker] ${serviceName} recovered, closing circuit`)
        status.state = 'CLOSED'
        status.failureCount = 0
        status.successCount = 0
      }
    } else if (status.state === 'CLOSED') {
      status.failureCount = 0
    }
    
    return result
  } catch (error) {
    status.failureCount++
    status.lastFailureTime = Date.now()
    
    if (status.failureCount >= finalConfig.failureThreshold) {
      console.warn(
        `[Circuit Breaker] ${serviceName} failing (${status.failureCount} failures), opening circuit`
      )
      status.state = 'OPEN'
    }
    
    throw error
  }
}

/**
 * Get circuit breaker status for monitoring
 */
export function getCircuitBreakerStatus(serviceName: string): CircuitBreakerStatus | null {
  return circuitBreakers.get(serviceName) || null
}

/**
 * Reset a circuit breaker (admin use)
 */
export function resetCircuitBreaker(serviceName: string): void {
  circuitBreakers.delete(serviceName)
}

/**
 * Get all circuit breaker statuses
 */
export function getAllCircuitBreakerStatus(): Record<string, CircuitBreakerStatus> {
  const status: Record<string, CircuitBreakerStatus> = {}
  circuitBreakers.forEach((value, key) => {
    status[key] = value
  })
  return status
}
