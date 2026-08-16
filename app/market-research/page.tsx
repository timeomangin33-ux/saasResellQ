'use client'

import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '@/app/dashboard-layout'
import { Search, Sparkles, SlidersHorizontal, BadgeCheck, ArrowRight } from 'lucide-react'

interface CategoryItem {
  name: string
  topItems?: Array<{ title: string; brand: string; price: number; demandScore: number; profitMargin: number }>
}

export default function MarketResearchPage() {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Toutes')
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/vinted/top-categories')
        const data = await res.json()
        setCategories(data.categories ?? [])
      } catch {
        setCategories([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const filtered = useMemo(() => {
    return categories.filter((item) => {
      const matchesCategory = selectedCategory === 'Toutes' || item.name === selectedCategory
      const matchesQuery = !query.trim() || item.name.toLowerCase().includes(query.toLowerCase())
      return matchesCategory && matchesQuery
    })
  }, [categories, query, selectedCategory])

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_35%),linear-gradient(135deg,_#111116_0%,_#09090b_100%)] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-violet-300">Explorateur de marché</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Un moteur de recherche premium, pensé pour l'action.</h1>
              <p className="mt-3 text-sm leading-6 text-zinc-400">Recherchez par catégorie, marque, potentiel de marge et demande. Chaque résultat est présenté comme une opportunité exploitable.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-zinc-400">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="h-4 w-4 text-violet-300" />
                Recherche instantanée
              </div>
              <p className="mt-2 max-w-xs text-sm leading-5">Aucune donnée inventée. Les résultats s'affichent uniquement quand les signaux sont disponibles.</p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#111116] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-400">
              <Search className="h-4 w-4 text-violet-300" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher une catégorie, une marque ou une opportunité"
                className="w-full bg-transparent outline-none placeholder:text-zinc-500"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSelectedCategory('Toutes')} className={`rounded-full border px-3 py-2 text-sm ${selectedCategory === 'Toutes' ? 'border-violet-400/30 bg-violet-500/10 text-violet-200' : 'border-white/10 bg-white/[0.03] text-zinc-400'}`}>Toutes</button>
              {categories.slice(0, 6).map((item) => (
                <button key={item.name} onClick={() => setSelectedCategory(item.name)} className={`rounded-full border px-3 py-2 text-sm ${selectedCategory === item.name ? 'border-violet-400/30 bg-violet-500/10 text-violet-200' : 'border-white/10 bg-white/[0.03] text-zinc-400'}`}>{item.name}</button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-[#111116] p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <SlidersHorizontal className="h-4 w-4 text-violet-300" />
              Filtres
            </div>
            <div className="mt-4 space-y-3 text-sm text-zinc-400">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">Prix • Marque • Catégorie • État</div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">Popularité • Demande • ROI • Marge</div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">Tri intelligent • Plus récent • Plus rentable</div>
            </div>
          </div>
          <div className="lg:col-span-2 rounded-[24px] border border-white/10 bg-[#111116] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Résultats</p>
                <p className="mt-1 text-sm text-zinc-500">{filtered.length > 0 ? `${filtered.length} catégorie${filtered.length > 1 ? 's' : ''} correspondante${filtered.length > 1 ? 's' : ''}` : 'Aucun résultat'}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-400">Interface prête pour les clients</span>
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                <>
                  {[...Array(3)].map((_, index) => <div key={index} className="h-20 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />)}
                </>
              ) : filtered.length > 0 ? (
                filtered.map((item) => (
                  <div key={item.name} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">{item.name}</p>
                        <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-violet-200">Live</span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-500">{item.topItems?.[0]?.title ?? 'Analyse en attente pour cette catégorie.'}</p>
                    </div>
                    <button className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-300">
                      Détails
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] p-8 text-center text-sm text-zinc-500">
                  Aucune donnée disponible pour cette combinaison de filtres.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
