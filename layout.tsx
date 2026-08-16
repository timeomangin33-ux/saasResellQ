import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import { Providers } from '@/providers'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'ResellQ — Find Trends. Predict Demand. Maximize Profit.',
  description: "La plateforme d'analyse #1 pour les revendeurs sur Vinted, eBay, Leboncoin et plus. Identifiez les tendances, prédisez la demande et maximisez vos profits.",
  keywords: 'vinted, analyse, tendances, revendeur, seconde main, marketplace, profit',
  authors: [{ name: 'ResellQ' }],
  openGraph: {
    title: 'ResellQ — Find Trends. Predict Demand. Maximize Profit.',
    description: "La plateforme d'analyse #1 pour les revendeurs sur Vinted et autres marketplaces.",
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className="dark">
      <body className={`${inter.variable} font-sans bg-background text-foreground antialiased`}>
        <Providers>
          <div className="relative min-h-screen">
            <div className="absolute inset-0 -z-10 h-full w-full bg-zinc-950 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-[0.03]" />
            {children}
            <Toaster />
          </div>
        </Providers>
      </body>
    </html>
  )
}

