/**
 * CORS and Security Headers Middleware
 * Adds essential security headers to all API responses
 */

import { NextRequest, NextResponse } from 'next/server'

export function withSecurityHeaders(response: NextResponse) {
  // CORS headers
  response.headers.set('Access-Control-Allow-Origin', process.env.NEXTAUTH_URL || 'http://localhost:3000')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  
  // Cache control for API
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  
  return response
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export function handleCORSPreflight() {
  return withSecurityHeaders(
    NextResponse.json(
      { message: 'OK' },
      { status: 200 }
    )
  )
}

/**
 * Middleware helper for use in route handlers
 * Usage:
 * import { withSecurityHeaders } from '@/lib/middleware/security'
 * 
 * export function OPTIONS() {
 *   return handleCORSPreflight()
 * }
 * 
 * export async function GET(req: NextRequest) {
 *   const response = NextResponse.json({ data: 'value' })
 *   return withSecurityHeaders(response)
 * }
 */
