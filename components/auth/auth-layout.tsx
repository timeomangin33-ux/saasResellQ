'use client'

import Link from 'next/link'
import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Logo } from '@/components/ui/logo'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.20),_transparent_32%),linear-gradient(135deg,_#020617_0%,_#050816_55%,_#020617_100%)]">
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,_rgba(34,211,238,0.12),_transparent_24%)]" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute h-[380px] w-[380px] rounded-full bg-emerald-500/10 blur-[110px]"
        style={{ top: '10%', right: '-6%' }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative flex min-h-screen">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:flex lg:w-[44%] flex-col justify-between border-r border-white/10 bg-slate-950/80 p-10 backdrop-blur-xl"
        >
          <div>
            <Logo size="lg" />
            <div className="mt-12 space-y-6">
              <div className="chip border-emerald-400/20 bg-emerald-500/10 text-[11px] uppercase tracking-[0.3em] text-emerald-300">
                Premium access
              </div>
              <blockquote className="max-w-md text-lg leading-8 text-slate-200">
                "ResellQ m'a permis d'augmenter mes marges de 27% en un mois. Je trouve les bons produits beaucoup plus vite."
              </blockquote>
              <div>
                <p className="text-sm font-semibold text-white">Marie L.</p>
                <p className="text-xs text-slate-400">Revendeuse pro · Paris</p>
              </div>
            </div>
          </div>
          <div className="panel p-5 text-sm text-slate-400">
            Données Vinted analysées en temps réel · +50 000 revendeurs actifs · support prioritaire
          </div>
        </motion.div>

        <div className="flex flex-1 flex-col">
          <div className="p-4 lg:hidden">
            <Logo size="md" />
          </div>

          <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="w-full max-w-md panel-strong p-6 shadow-[0_30px_90px_rgba(2,6,23,0.45)] sm:p-8"
            >
              <div className="mb-8">
                <Link
                  href="/"
                  className="mb-6 inline-flex items-center text-xs font-medium text-slate-400 transition hover:text-white"
                >
                  ← Retour à l'accueil
                </Link>
                <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
                <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>
              </div>
              {children}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
