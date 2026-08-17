'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import DashboardLayout from '@/app/dashboard-layout'
import { Reveal, StaggerGroup, staggerItem } from '@/components/ui/reveal'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { Magnetic } from '@/components/ui/magnetic'
import { Search, Sparkles, SlidersHorizontal, ArrowRight } from 'lucide-react'

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
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_35%),linear-gradient(135deg,_#0d100e_0%,_#09090b_100%)] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:p-8"
        >
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px]"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="kicker">Explorateur de marché</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Un moteur de recherche premium, pensé pour l'action.</h1>
              <p className="mt-3 text-sm leading-6 text-zinc-400">Recherchez par catégorie, marque, potentiel de marge et demande. Chaque résultat est présenté comme une opportunité exploitable.</p>
            </div>
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] p-4 text-sm text-zinc-400">
              <div className="flex items-center gap-2 text-white">
                <motion.span animate={{ rotate: [0, 15, -10, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                  <Sparkles className="h-4 w-4 text-emerald-300" />
                </motion.span>
                Recherche instantanée
              </div>
              <p className="mt-2 max-w-xs text-sm leading-5">Les résultats s'affichent uniquement quand les signaux réels sont disponibles.</p>
            </div>
          </div>
        </motion.section>

        <Reveal delay={0.05} className="mt-6">
          <SpotlightCard spotlightColor="rgba(16,185,129,0.12)" className="panel panel-hover p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <label className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-400 transition-colors focus-within:border-emerald-400/40">
                <Search className="h-4 w-4 text-emerald-300" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher une catégorie, une marque ou une opportunité"
                  className="w-full bg-transparent outline-none placeholder:text-zinc-500"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Magnetic strength={0.1}>
                  <button onClick={() => setSelectedCategory('Toutes')} className={`rounded-full border px-3 py-2 text-sm transition-colors ${selectedCategory === 'Toutes' ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/[0.03] text-zinc-400'}`}>Toutes</button>
                </Magnetic>
                {categories.slice(0, 6).map((item) => (
                  <Magnetic key={item.name} strength={0.1}>
                    <button onClick={() => setSelectedCategory(item.name)} className={`rounded-full border px-3 py-2 text-sm transition-colors ${selectedCategory === item.name ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200'}`}>{item.name}</button>
                  </Magnetic>
                ))}
              </div>
            </div>
          </SpotlightCard>
        </Reveal>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <Reveal className="panel panel-hover p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <SlidersHorizontal className="h-4 w-4 text-emerald-300" />
              Filtres
            </div>
            <div className="mt-4 space-y-3 text-sm text-zinc-400">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">Prix • Marque • Catégorie • État</div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">Popularité • Demande • ROI • Marge</div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">Tri intelligent • Plus récent • Plus rentable</div>
            </div>
          </Reveal>
          <Reveal delay={0.08} className="panel panel-hover lg:col-span-2 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Résultats</p>
                <p className="mt-1 text-sm text-zinc-500">{filtered.length > 0 ? `${filtered.length} catégorie${filtered.length > 1 ? 's' : ''} correspondante${filtered.length > 1 ? 's' : ''}` : 'Aucun résultat'}</p>
              </div>
            </div>

            <StaggerGroup className="mt-5 space-y-3">
              {loading ? (
                [...Array(3)].map((_, index) => (
                  <div key={index} className="h-20 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                    <motion.div
                      className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      animate={{ x: ['-100%', '400%'] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'linear', delay: index * 0.1 }}
                    />
                  </div>
                ))
              ) : filtered.length > 0 ? (
                filtered.map((item) => (
                  <motion.div
                    key={item.name}
                    variants={staggerItem}
                    whileHover={{ x: 4 }}
                    className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-emerald-400/25 hover:bg-emerald-500/[0.04] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">{item.name}</p>
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-200">Live</span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-500">{item.topItems?.[0]?.title ?? 'Analyse en attente pour cette catégorie.'}</p>
                    </div>
                    <Magnetic strength={0.15}>
                      <Link href={`/categories/${encodeURIComponent(item.name)}`} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-300 transition hover:border-emerald-400/30 hover:text-emerald-200">
                        Détails
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Magnetic>
                  </motion.div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] p-8 text-center text-sm text-zinc-500">
                  Aucune donnée disponible pour cette combinaison de filtres.
                </div>
              )}
            </StaggerGroup>
          </Reveal>
        </section>
      </div>
    </DashboardLayout>
  )
}
