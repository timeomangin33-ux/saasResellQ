import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import '../globals.css'
import '../lib/initEnv' // Validate environment variables on startup
import { Providers } from '../providers'
import { Toaster } from '../components/ui/toaster'
import { CookieConsent } from '../components/cookie-consent'
import { ConditionalSiteFooter } from '../components/conditional-site-footer'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://www.resellq.com'),
  title: 'ResellQ — Intelligence marché pour revendeurs Vinted',
  description: 'Analysez les tendances Vinted, identifiez les opportunités rentables et maximisez vos marges avec l\'IA. Données en temps réel pour revendeurs professionnels.',
  keywords: 'vinted, analyse, tendances, revendeur, seconde main, marketplace, profit, resell',
  authors: [{ name: 'ResellQ' }],
  openGraph: {
    title: 'ResellQ — Intelligence marché pour revendeurs Vinted',
    description: 'Trouvez les tendances. Prédisez la demande. Maximisez vos profits.',
    type: 'website',
  },
  icons: {
    icon: '/resellq-logo.svg',
    apple: '/resellq-logo.svg',
    shortcut: '/resellq-logo.svg',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className={`${inter.variable} font-sans bg-background text-foreground antialiased`}>
        <Providers>
          <div className="relative min-h-screen">
            <div className="absolute inset-0 -z-10 h-full w-full bg-zinc-950 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-[0.03]" />
            <div className="flex min-h-screen flex-col">
              <div className="flex-1">{children}</div>
              <ConditionalSiteFooter />
            </div>
            <Toaster />
            <CookieConsent />
          </div>
        </Providers>
      </body>
    </html>
  )
}
