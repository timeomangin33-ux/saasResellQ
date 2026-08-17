"use client"
import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050507] text-white">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-40" />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="panel-strong relative max-w-xl p-10"
      >
        <p className="kicker">Erreur</p>
        <h1 className="mt-3 text-2xl font-semibold">Oups — une erreur est survenue</h1>
        <p className="mt-3 text-sm text-zinc-400">{error?.message || 'Une erreur inattendue est survenue.'}</p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => reset()} className="btn-shine rounded-lg bg-white px-4 py-2 font-semibold text-zinc-900 transition hover:-translate-y-0.5">
            Réessayer
          </button>
          <Link href="/" className="rounded-lg border border-white/[.08] px-4 py-2 text-sm transition hover:bg-white/[0.04]">
            Accueil
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
