import Link from 'next/link'
import React from 'react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0b0d] text-white">
      <div className="max-w-xl p-8 rounded-2xl bg-gradient-to-br from-[#111116] to-[#0b0b0d] border border-white/[.06] text-center">
        <h1 className="text-3xl font-bold">404 — Page introuvable</h1>
        <p className="mt-3 text-sm text-zinc-400">La page recherchée est introuvable ou a été déplacée.</p>
        <div className="mt-6">
          <Link href="/" className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-zinc-900 font-semibold">Retour à l';accueil</Link>
        </div>
      </div>
    </div>
  )
}
