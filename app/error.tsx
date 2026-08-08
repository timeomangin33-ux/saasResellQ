"use client"
import React from 'react'
import Link from 'next/link'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0b0d] text-white">
      <div className="max-w-xl p-8 rounded-2xl bg-gradient-to-br from-[#111116] to-[#0b0b0d] border border-white/[.06]">
        <h1 className="text-2xl font-semibold">Oups — une erreur est survenue</h1>
        <p className="mt-3 text-sm text-zinc-400">{error?.message || 'Une erreur inattendue est survenue.'}</p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => reset()} className="rounded-lg bg-white px-4 py-2 text-zinc-900 font-semibold">Réessayer</button>
          <Link href="/" className="rounded-lg border border-white/[.06] px-4 py-2 text-sm">Accueil</Link>
        </div>
      </div>
    </div>
  )
}
