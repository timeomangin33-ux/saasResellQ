'use client'

import { useEffect, useState } from 'react'
import { Cookie } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'resellq-cookie-consent'

export function CookieConsent() {
  const [visible, setVisible] = useState(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      return !stored
    } catch (e) {
      return false
    }
  })

  const handleChoice = (choice: 'accepted' | 'rejected') => {
    window.localStorage.setItem(STORAGE_KEY, choice)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-[80] w-[min(92vw,760px)] -translate-x-1/2 rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 p-2 text-emerald-300">
            <Cookie className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Ce site utilise des cookies pour la session et l&apos;am&eacute;lioration du produit.</p>
            <p className="mt-1 text-sm text-slate-400">Nous n&apos;utilisons pas vos donn&eacute;es pour la publicit&eacute;. Vous pouvez accepter ou refuser le stockage de cookies non essentiels.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/5" onClick={() => handleChoice('rejected')}>
            Refuser
          </Button>
          <Button size="sm" onClick={() => handleChoice('accepted')}>
            Accepter
          </Button>
        </div>
      </div>
    </div>
  )
}
