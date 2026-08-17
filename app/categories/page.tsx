'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, ChevronDown, Package2, Search, Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import DashboardLayout from '@/app/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { SpotlightCard } from '@/components/ui/spotlight-card'

interface TopItem {
  title: string
  brand: string
  price: number
  demandScore: number
  profitMargin: number
  trendPercent: number
  sales: number
}

interface Category {
  name: string
  category: string
  trend_direction: string | null
  trend_strength: number | null
  last_analyzed_at: string | null
  topItems: TopItem[]
}

function formatTrendValue(value: number | string | null | undefined) {
  const strength = typeof value === 'string' ? Number(value) : value
  if (strength === null || strength === undefined || !Number.isFinite(strength)) return '—'
  return `${strength > 0 ? '+' : ''}${strength.toFixed(1)}%`
}

function parseNumericValue(value: number | string | null | undefined): number {
  const numeric = typeof value === 'string' ? Number(value) : value
  if (typeof numeric !== 'number' || !Number.isFinite(numeric)) return 0
  return numeric
}

function getTrendTone(direction: string | null) {
  if (direction === 'up') return 'text-emerald-300 bg-emerald-500/10 border-emerald-400/20'
  if (direction === 'down') return 'text-rose-300 bg-rose-500/10 border-rose-400/20'
  return 'text-slate-300 bg-slate-500/10 border-slate-400/20'
}

function getTrendIcon(direction: string | null) {
  if (direction === 'up') return <TrendingUp className="h-3.5 w-3.5" />
  if (direction === 'down') return <TrendingDown className="h-3.5 w-3.5" />
  return <Minus className="h-3.5 w-3.5" />
}

function CategoriesContent({ categories, loading, error, search }: {
  categories: Category[]
  loading: boolean
  error: string
  search: string
}) {
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories
    const query = search.toLowerCase()
    return categories.filter((category) => category.name.toLowerCase().includes(query))
  }, [categories, search])

  if (error) {
    return <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-200">{error}</div>
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="h-28 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <motion.div
              className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ x: ['-100%', '400%'] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'linear', delay: index * 0.08 }}
            />
          </div>
        ))}
      </div>
    )
  }

  if (filteredCategories.length === 0) {
    return <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] p-8 text-center text-sm text-slate-400">Aucune catégorie ne correspond à votre recherche.</div>
  }

  return (
    <div className="space-y-3">
      {filteredCategories.map((category, index) => {
        const bestScore = category.topItems[0]?.demandScore ?? 0
        const currentItems = (category.topItems ?? []) as TopItem[]
        let totalPrice = 0
        for (const item of currentItems) {
          totalPrice += parseNumericValue(item.price)
        }
        const averagePrice = currentItems.length ? Math.round(totalPrice / currentItems.length) : 0

        return (
          <motion.details
            key={`${category.name}-${index}`}
            open={index === 0}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.05 }}
            className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f0e]/80 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] transition-colors hover:border-emerald-400/20"
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 hover:bg-emerald-500/[0.03]">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-2 text-emerald-200">
                  <Package2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-white">{category.name}</h3>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      Top 20
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">Produits à forte demande • meilleur score {bestScore}/100</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${getTrendTone(category.trend_direction)}`}>
                  {getTrendIcon(category.trend_direction)}
                  {formatTrendValue(category.trend_strength)}
                </div>
                <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400 sm:block">
                  {category.topItems.length} produits
                </div>
                <ChevronDown className="h-4 w-4 flex-shrink-0 text-zinc-500 transition-transform duration-300 group-open:rotate-180" />
              </div>
            </summary>

            <div className="border-t border-white/10 bg-black/20 p-4">
              <div className="mb-4 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Prix moyen</p>
                  <p className="mt-1 text-lg font-semibold text-white">{averagePrice}€</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Score de demande</p>
                  <p className="mt-1 text-lg font-semibold text-white">{bestScore}/100</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Dernière analyse</p>
                  <p className="mt-1 text-sm text-slate-300">{category.last_analyzed_at ? new Date(category.last_analyzed_at).toLocaleString('fr-FR') : 'À venir'}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.24em] text-slate-500">
                      <th className="px-2 py-2">#</th>
                      <th className="px-2 py-2">Produit</th>
                      <th className="px-2 py-2">Marque</th>
                      <th className="px-2 py-2">Prix</th>
                      <th className="px-2 py-2">Demand</th>
                      <th className="px-2 py-2">Marge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.topItems.slice(0, 20).map((item, itemIndex) => (
                      <tr key={`${category.name}-${item.title}-${itemIndex}`} className="border-b border-white/10 text-slate-300 last:border-b-0 transition-colors hover:bg-emerald-500/[0.04]">
                        <td className="px-2 py-2 text-slate-500">{itemIndex + 1}</td>
                        <td className="px-2 py-2 font-medium text-white">{item.title}</td>
                        <td className="px-2 py-2">{item.brand}</td>
                        <td className="px-2 py-2">{parseNumericValue(item.price).toFixed(0)}€</td>
                        <td className="px-2 py-2">{item.demandScore}/100</td>
                        <td className="px-2 py-2 font-medium text-emerald-300">{parseNumericValue(item.profitMargin)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.details>
        )
      })}
    </div>
  )
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let mounted = true

    async function fetchCategories() {
      if (!mounted) return
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/vinted/top-categories')
        if (!res.ok) throw new Error('Impossible de charger les catégories')
        const { categories } = await res.json()
        if (mounted) setCategories(categories ?? [])
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Erreur de chargement')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchCategories()
    const id = setInterval(() => void fetchCategories(), 60000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [])

  return (
    <DashboardLayout>
      <div className="page-container py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
        >
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-emerald-500/10 blur-[90px]"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <PageHeader
                title="Catégories & Top 20"
                description="Une vue d'ensemble pro, claire et exploitable pour suivre chaque marché, ses meilleures opportunités et son potentiel de marge."
              />
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-200">
                  <motion.span className="h-1.5 w-1.5 rounded-full bg-emerald-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.8, repeat: Infinity }} />
                  Live sync
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Mises à jour régulières</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Priorité marge & demande</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
              <div className="flex items-center gap-2 font-medium text-white">
                <Sparkles className="h-4 w-4 text-emerald-300" />
                Vue opérateur
              </div>
              <p className="mt-2 max-w-xs text-slate-400">Chaque catégorie expose ses 20 produits les plus pertinents, avec une lecture rapide de la demande, du prix et du potentiel de marge.</p>
            </div>
          </div>
        </motion.div>

        <Reveal className="mb-6">
          <SpotlightCard spotlightColor="rgba(16,185,129,0.12)" className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0d0f0e]/80 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <BarChart3 className="h-4 w-4 text-emerald-300" />
              <span>{categories.length} catégories actives analysées</span>
            </div>
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-400 transition-colors focus-within:border-emerald-400/40 lg:min-w-[320px]">
              <Search className="h-4 w-4" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher une catégorie"
                className="w-full bg-transparent outline-none placeholder:text-slate-500"
              />
            </label>
          </SpotlightCard>
        </Reveal>

        <CategoriesContent categories={categories} loading={loading} error={error} search={search} />
      </div>
    </DashboardLayout>
  )
}
