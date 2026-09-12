import { NextResponse } from 'next/server'
import type { NextRequest, NextFetchEvent } from 'next/server'

const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-XSS-Protection': '1; mode=block'
}

// Fenêtre d'attribution du parrainage. Un visiteur qui découvre ResellQ par la
// vidéo d'un partenaire ne s'abonne presque jamais le jour même : il revient
// après avoir comparé, parfois plusieurs semaines plus tard. 60 jours couvrent
// ce délai de décision sans attribuer une vente indéfiniment à un lien oublié.
const FENETRE_ATTRIBUTION_JOURS = 60
const COOKIE_PARRAINAGE = 'resellq_ref'

export function middleware(request: NextRequest, event: NextFetchEvent) {
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
  // La politique complète est définie une seule fois, dans next.config.ts.
  // Y toucher ici l'écraserait : le middleware ne règle donc que l'en-tête
  // hérité X-Frame-Options, que la configuration ne peut pas nuancer seule.
  if (request.nextUrl.pathname.startsWith('/film/')) {
    response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  }

  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  }

  // Parrainage : le code arrive dans l'URL (?ref=CODE) sur n'importe quelle
  // page, et doit survivre jusqu'à l'inscription, qui se fait plus tard et
  // ailleurs. On ne vérifie pas ici que le code existe : le middleware tourne
  // sur l'Edge, sans accès à la base. La validation est faite à l'inscription,
  // qui ignore purement et simplement un code inconnu ou désactivé.
  const codeBrut = request.nextUrl.searchParams.get('ref')
  if (codeBrut) {
    const code = codeBrut.trim().toUpperCase().slice(0, 40)
    // Filtre de forme uniquement : un cookie ne doit pas transporter n'importe
    // quelle chaîne venue de l'URL.
    if (/^[A-Z0-9_-]+$/.test(code)) {
      // Quelqu'un qui arrive pour la première fois par ce lien, ou qui revient
      // par un autre. Un rechargement de la même page, lui, porte déjà le
      // cookie et ne compte pas : la mesure doit dire « untel a amené tant de
      // personnes », pas « tant de pages ont été vues ».
      const dejaAttribue = request.cookies.get(COOKIE_PARRAINAGE)?.value

      response.cookies.set(COOKIE_PARRAINAGE, code, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: FENETRE_ATTRIBUTION_JOURS * 24 * 60 * 60,
      })

      if (dejaAttribue !== code) {
        // Le middleware tourne sur l'Edge, sans Prisma : le comptage passe donc
        // par une route Node. `waitUntil` la laisse finir après que la réponse
        // est partie — le visiteur n'attend pas son propre comptage, et un
        // compteur en panne ne retarde ni ne casse la page qu'il demandait.
        event.waitUntil(
          fetch(new URL('/api/parrainage/visite', request.nextUrl.origin), {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code }),
          }).catch(() => {
            // Volontairement muet : voir ci-dessus.
          }),
        )
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)']
}
