'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/app/dashboard-layout'
import { motion } from 'framer-motion'
import { Reveal } from '@/components/ui/reveal'
import { Clock3, Search, History, Loader2 } from 'lucide-react'

/**
 * L'état vide promettait « Vos recherches sauvegardées apparaîtront ici
 * automatiquement ». Rien dans le code ne crée de SavedSearch : /api/searches
 * n'expose qu'un GET, aucune page n'enregistre de recherche. Sur une page
 * réservée aux comptes PRO, la promesse revenait à faire payer une fonction
 * absente. Le texte dit maintenant l'état réel.
 */
interface SavedSearchItem {
  id: string
  query: string
  createdAt: string
}

export default function HistoryPage() {
  const [searches, setSearches] = useState<SavedSearchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/searches')
      .then(async (res) => {
        if (!res.ok) throw new Error('Impossible de charger votre historique.')
        return res.json()
      })
      .then((data) => setSearches(data.searches ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur inconnue.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardLayout>
      <div className="page-container py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-[32px] border border-white/10 bg-[#111116] p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
        >
          <div className="flex items-center gap-3 text-sm text-violet-300">
            <Clock3 className="h-5 w-5" />
            <span>Historique</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Vos recherches</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-400">Cette page liste les recherches enregistrées sur votre compte ResellQ.</p>

          {loading && (
            <div className="mt-10 flex items-center justify-center py-10 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {!loading && error && (
            <Reveal className="mt-10 rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center text-sm text-red-300">
              {error}
            </Reveal>
          )}

          {!loading && !error && searches.length === 0 && (
            <Reveal delay={0.1} className="mt-10 rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
              <History className="mx-auto h-10 w-10 text-violet-300" />
              <h2 className="mt-4 text-2xl font-semibold text-white">Aucune recherche enregistrée</h2>
              <p className="mt-2 text-sm text-slate-400">
                L'enregistrement des recherches n'est pas encore actif dans l'application : aucune de vos recherches
                n'est conservée pour le moment. Cette page les affichera dès que la sauvegarde sera disponible.
              </p>
            </Reveal>
          )}

          {!loading && !error && searches.length > 0 && (
            <div className="mt-10 divide-y divide-white/10 rounded-2xl border border-white/10">
              {searches.map((s, index) => (
                <Reveal key={s.id} delay={index * 0.03} className="flex items-center gap-4 px-5 py-4">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-200">
                    <Search className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{s.query}</p>
                    <p className="text-xs text-slate-500">{new Date(s.createdAt).toLocaleString('fr-FR')}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
