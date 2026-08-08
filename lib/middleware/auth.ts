/**
 * Middleware for authentication and authorization
 * Protects sensitive API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export type AuthMiddlewareOptions = {
  requireAuth?: boolean
  requireRole?: 'ADMIN' | 'USER'
}

/**
 * Check authentication and authorization
 * Usage in route handlers:
 * 
 * import { authMiddleware } from '@/lib/middleware/auth'
 * 
 * export async function POST(req: NextRequest) {
 *   const auth = await authMiddleware(req, { requireAuth: true, requireRole: 'ADMIN' })
 *   if (!auth.authenticated) return auth.error
 *   
 *   // ... rest of handler
 * }
 */
export async function authMiddleware(
  req: NextRequest,
  options: AuthMiddlewareOptions = { requireAuth: false }
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

    if (options.requireAuth && !token) {
      return {
        authenticated: false,
        error: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        ),
      }
    }

    if (options.requireRole && token?.role !== options.requireRole) {
      return {
        authenticated: false,
        error: NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        ),
      }
    }

    return {
      authenticated: true,
      token,
    }
  } catch (error) {
    return {
      authenticated: false,
      error: NextResponse.json(
        { error: 'Authentication error' },
        { status: 401 }
      ),
    }
  }
}
