/**
 * Centralized Error Handler
 * Standardized error handling and logging for all API routes
 */

import { NextRequest, NextResponse } from 'next/server'

export type ApiError = {
  code: string
  message: string
  statusCode: number
  details?: unknown
}

/**
 * Standard API error codes
 */
export const ERROR_CODES = {
  // 400 Bad Request
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // 401 Unauthorized
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // 403 Forbidden
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // 404 Not Found
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // 429 Too Many Requests
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // 500 Internal Server Error
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const

/**
 * Create a standardized API error
 */
export function createApiError(
  code: string,
  message: string,
  statusCode: number,
  details?: unknown
): ApiError {
  return { code, message, statusCode, details }
}

/**
 * Log error with structured format
 */
export function logError(error: ApiError, context?: Record<string, unknown>) {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    ...error,
    context,
  }

  if (error.statusCode >= 500) {
    console.error('[ERROR]', JSON.stringify(logEntry))
  } else if (error.statusCode >= 400) {
    console.warn('[WARN]', JSON.stringify(logEntry))
  } else {
    console.log('[INFO]', JSON.stringify(logEntry))
  }
}

/**
 * Handle and respond to API errors
 * 
 * Usage:
 * import { handleApiError, ERROR_CODES, createApiError } from '@/lib/errors'
 * 
 * export async function POST(req: NextRequest) {
 *   try {
 *     // ... request handling
 *   } catch (error) {
 *     const apiError = createApiError(
 *       ERROR_CODES.INTERNAL_ERROR,
 *       'Failed to process request',
 *       500,
 *       error
 *     )
 *     return handleApiError(apiError)
 *   }
 * }
 */
export function handleApiError(error: ApiError, logContext?: Record<string, unknown>) {
  logError(error, logContext)

  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { details: error.details }),
      },
    },
    { status: error.statusCode }
  )
}

/**
 * Catch-all error handler for unexpected errors
 */
export function handleUnexpectedError(
  error: unknown,
  context?: Record<string, unknown>
): NextResponse {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred'
  const apiError = createApiError(
    ERROR_CODES.INTERNAL_ERROR,
    message,
    500,
    process.env.NODE_ENV === 'development' ? error : undefined
  )

  return handleApiError(apiError, { ...context, originalError: error })
}

/**
 * Validation error helper
 */
export function handleValidationError(
  message: string,
  details?: Record<string, unknown>
): NextResponse {
  const error = createApiError(
    ERROR_CODES.VALIDATION_ERROR,
    message,
    400,
    details
  )
  return handleApiError(error)
}

/**
 * Not found error helper
 */
export function handleNotFound(resourceType: string): NextResponse {
  const error = createApiError(
    ERROR_CODES.NOT_FOUND,
    `${resourceType} not found`,
    404
  )
  return handleApiError(error)
}

/**
 * Unauthorized error helper
 */
export function handleUnauthorized(message = 'Authentication required'): NextResponse {
  const error = createApiError(
    ERROR_CODES.UNAUTHORIZED,
    message,
    401
  )
  return handleApiError(error)
}

/**
 * Forbidden error helper
 */
export function handleForbidden(message = 'You do not have permission to access this resource'): NextResponse {
  const error = createApiError(
    ERROR_CODES.FORBIDDEN,
    message,
    403
  )
  return handleApiError(error)
}

/**
 * Rate limit error helper
 */
export function handleRateLimitError(resetTime: number): NextResponse {
  const response = NextResponse.json(
    {
      error: {
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        message: 'Too many requests, please try again later',
      },
    },
    { status: 429 }
  )
  response.headers.set('Retry-After', String(Math.ceil((resetTime - Date.now()) / 1000)))
  return response
}
