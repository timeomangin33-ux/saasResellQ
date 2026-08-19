import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-XSS-Protection': '1; mode=block'
}

export function middleware(request: NextRequest) {
  const { hostname, protocol } = request.nextUrl
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'

  if (process.env.NODE_ENV === 'production' && !isLocalhost && protocol === 'http:') {
    const httpsUrl = new URL(request.url)
    httpsUrl.protocol = 'https:'
    return NextResponse.redirect(httpsUrl, 308)
  }

  const response = NextResponse.next()

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Le film publicitaire est intégré en iframe dans notre propre page d'accueil.
  // On autorise la mise en cadre par ce seul site — page statique, sans session
  // ni formulaire, donc sans surface de détournement de clic.
  if (request.nextUrl.pathname.startsWith('/film/')) {
    response.headers.set('X-Frame-Options', 'SAMEORIGIN')
    response.headers.set('Content-Security-Policy', "frame-ancestors 'self'")
  }

  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)']
}
