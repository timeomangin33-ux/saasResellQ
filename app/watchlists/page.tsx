'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/app/dashboard-layout'
import { AnimatePresence, motion } from 'framer-motion'
import { PageHeader } from '@/components/ui/page-header'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { Magnetic } from '@/components/ui/magnetic'
import { Star, Plus, Trash2, Loader2, X, Search } from 'lucide-react'

interface Watchlist {
  id: string
  name: string
  query: string
  category: string | null
  minPrice: number | null
  maxPrice: number | null
  createdAt: string
}

export default function WatchlistsPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', query: '', category: '', minPrice: '', maxPrice: '' })
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/watchlists')
        if (!res.ok) throw new Error('Impossible de charger vos veilles.')
        const data = await res.json()
        setWatchlists(data.watchlists ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur inconnue.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!form.name.trim() || !form.query.trim()) {
      setFormError('Le nom et la recherche sont requis.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/watchlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          query: form.query.trim(),
          category: form.category.trim() || undefined,
          minPrice: form.minPrice ? Number(form.minPrice) : undefined,
          maxPrice: form.maxPrice ? Number(form.maxPrice) : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Échec de la création.')
      setWatchlists((prev) => [data.watchlist, ...prev])
      setForm({ name: '', query: '', category: '', minPrice: '', maxPrice: '' })
      setShowForm(false)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erreur inconnue.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/watchlists/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Échec de la suppression.')
      setWatchlists((prev) => prev.filter((w) => w.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <PageHeader
          title="Veilles"
          kicker="Suivi personnalisé"
          icon={Star}
          description="Suivez vos recherches, catégories et fourchettes de prix préférées."
          actions={
            <Magnetic strength={0.2}>
              <button
                onClick={() => setShowForm((v) => !v)}
                className="btn-shine inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary via-emerald-400 to-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5"
              >
                {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showForm ? 'Annuler' : 'Ajouter'}
              </button>
            </Magnetic>
          }
        />

        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleCreate}
              className="panel mt-6 overflow-hidden p-6"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Nom</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Nike Air Force"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Recherche / mots-clés</label>
                  <input
                    value={form.query}
                    onChange={(e) => setForm((f) => ({ ...f, query: e.target.value }))}
                    placeholder="nike air force 1"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Catégorie (optionnel)</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    placeholder="Chaussures"
                    className="input-field"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Prix min (€)</label>
                    <input
                      value={form.minPrice}
                      onChange={(e) => setForm((f) => ({ ...f, minPrice: e.target.value }))}
                      type="number"
                      min="0"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Prix max (€)</label>
                    <input
                      value={form.maxPrice}
                      onChange={(e) => setForm((f) => ({ ...f, maxPrice: e.target.value }))}
                      type="number"
                      min="0"
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
              {formError && <p className="mt-3 text-sm text-red-400">{formError}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary via-emerald-400 to-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Créer la veille
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-6 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {!loading && error && (
            <div className="panel p-6 text-sm text-red-400">{error}</div>
          )}

          {!loading && !error && watchlists.length === 0 && (
            <div className="panel flex flex-col items-center gap-3 p-12 text-center">
              <Search className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-white">Aucune veille pour le moment</p>
              <p className="max-w-sm text-sm text-muted-foreground">Créez votre première veille pour suivre un produit, une marque ou une fourchette de prix.</p>
            </div>
          )}

          <AnimatePresence>
            {!loading && watchlists.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4, delay: index * 0.04 }}
              >
              <SpotlightCard spotlightColor="rgba(16,185,129,0.12)" className="panel panel-hover p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 truncate text-lg font-bold text-white">{item.name}</h3>
                    <p className="mb-3 text-sm text-muted-foreground">"{item.query}"{item.category ? ` · ${item.category}` : ''}</p>
                    {(item.minPrice != null || item.maxPrice != null) && (
                      <div className="flex gap-6">
                        <div>
                          <p className="text-xs text-muted-foreground">Prix min</p>
                          <p className="font-bold text-white">{item.minPrice != null ? `€${item.minPrice}` : '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Prix max</p>
                          <p className="font-bold text-amber-400">{item.maxPrice != null ? `€${item.maxPrice}` : '—'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="flex-shrink-0 rounded-xl p-3 text-red-400 transition hover:bg-red-500/10 disabled:opacity-60"
                  >
                    {deletingId === item.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                  </button>
                </div>
              </SpotlightCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  )
}
