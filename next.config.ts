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
    return [
      {
        // Tout le site sauf le film : aucune mise en cadre, même par nous.
        source: '/((?!film/).*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
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
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
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
