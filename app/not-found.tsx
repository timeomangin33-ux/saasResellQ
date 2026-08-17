'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050507] text-white">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-40" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-[120px]"
        style={{ top: '20%', left: '50%', translateX: '-50%' }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="panel-strong relative max-w-xl p-10 text-center"
      >
        <p className="kicker justify-center">Erreur 404</p>
        <h1 className="mt-3 text-3xl font-bold text-gradient">Page introuvable</h1>
        <p className="mt-3 text-sm text-zinc-400">La page recherchée est introuvable ou a été déplacée.</p>
        <div className="mt-8">
          <Link href="/" className="btn-shine inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 font-semibold text-zinc-900 transition hover:-translate-y-0.5">
            Retour à l'accueil
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
