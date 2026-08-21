import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  images: {
    domains: [
      'images.vinted.net',
      'thumbs.vinted.net',
      'photos.vinted.net',
      'images.unsplash.com',
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com',
    ],
  },
  webpack(config, { dev, isServer }) {
    if (!dev && isServer) {
      config.devtool = false
    }
    return config
  },
  async headers() {
    // Content-Security-Policy : le seul en-tête qui limite les dégâts si un
    // script étranger arrive à s'exécuter. Chaque source listée correspond à
    // quelque chose que le site charge réellement — images Vinted, polices
    // Google, Stripe pour le paiement, Vercel pour la mesure d'audience.
    //
    // 'unsafe-inline' et 'unsafe-eval' sur les scripts sont imposés par Next.js
    // en développement et par son hydratation ; les retirer demande un nonce
    // sur chaque page, ce qui se fait par middleware et mérite son propre
    // chantier. La politique reste utile telle quelle : elle ferme
    // l'exfiltration vers un domaine tiers, qui est le vrai risque.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.vinted.net https://images.unsplash.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
      "connect-src 'self' https://api.stripe.com https://va.vercel-scripts.com https://vitals.vercel-insights.com",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; ')

    return [
      {
        // Tout le site sauf le film : aucune mise en cadre, même par nous.
        source: '/((?!film/).*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
      {
        // Le film publicitaire est intégré en iframe dans notre propre page
        // d'accueil : on autorise la mise en cadre par ce seul site, et rien
        // d'autre. Page statique sans session ni formulaire, donc sans risque
        // de détournement de clic.
        source: '/film/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: csp.replace("frame-ancestors 'none'", "frame-ancestors 'self'") },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ]
  },
  experimental: {
    cpus: 1,
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
}

export default nextConfig
