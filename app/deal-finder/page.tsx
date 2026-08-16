'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { useSession } from 'next-auth/react'
import { normalizePlan } from '@/lib/plans'
import { PlanGate } from '@/components/plan-gate'
import { Search, SlidersHorizontal, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Deal {
  id: string
  title: string
  price: number
  brand: string
  category: string
  profitMargin: number
  demandScore: number
  estimatedProfit?: number
  whyNow?: string
  url?: string
}

interface TopCategory {
  name: string
  category?: string
  trend_direction?: string
  trend_strength?: string
}

export default function DealFinderPage() {
  const { data: session, status } = useSession()
  const planKey = normalizePlan(session?.user?.subscriptionPlan)
  const [filters, setFilters] = useState({ minBudget: 20, maxBudget: 300, category: '', riskLevel: 'medium', minProfit: 30 })
  const [topCategories, setTopCategories] = useState<TopCategory[]>([])
  const [results, setResults] = useState<Deal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    async function loadTopCategories() {
      try {
        const res = await fetch('/api/vinted/top-categories')
        if (!res.ok) return
        const data = await res.json()
        const categories = Array.isArray(data.categories) ? data.categories : []
        setTopCategories(categories.slice(0, 20))
      } catch {
        // ignore failures
      }
    }
    void loadTopCategories()
  }, [])

  if (status === 'loading') {
    return <div className="grid min-h-screen place-items-center bg-[#09090b]"><div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" /></div>
  }

  if (planKey === 'STARTER') {
    return (
      <DashboardLayout>
        <PlanGate planKey={planKey} minimumPlan="PRO" feature="Deal Finder">
          <></>
        </PlanGate>
      </DashboardLayout>
    )
  }

  async function handleSearch() {
    setLoading(true)
    setError('')
    setSearched(true)
    try {
      const res = await fetch('/api/ai/deal-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResults(data.deals || data.opportunities || data || [])
    } catch {
      try {
        const params = new URLSearchParams()
        params.set('minProfit', filters.minProfit.toString())
        if (filters.category) params.set('category', filters.category)
        const res = await fetch(`/api/vinted/opportunities?${params}`)
        const data = await res.json()
        setResults(data.opportunities || [])
      } catch {
        setError('Impossible de charger les résultats. Vérifiez la connexion au service d';analyse.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        <div>
          <h1 className="text-base font-semibold">Deal Finder</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Détection des meilleures opportunités selon vos critères</p>
          {topCategories.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">Top catégories détectées : {topCategories.slice(0, 8).map((category) => category.name).join(', ')}</p>
          )}
        </div>

        {/* Filtres */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Critères</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Budget min — {filters.minBudget}€</label>
              <input type="range" min="5" max="500" value={filters.minBudget}
                onChange={e => setFilters({ ...filters, minBudget: Number(e.target.value) })}
                className="w-full accent-primary h-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Budget max — {filters.maxBudget}€</label>
              <input type="range" min="10" max="1000" value={filters.maxBudget}
                onChange={e => setFilters({ ...filters, maxBudget: Number(e.target.value) })}
                className="w-full accent-primary h-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Catégorie</label>
              <select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-3 py-1.5 text-sm rounded-lg bg-muted/40 border border-border focus:border-primary/50 outline-none">
                <option value="">Toutes les catégories</option>
                {topCategories.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Marge min (%)</label>
              <input type="number" value={filters.minProfit} min="0" max="100"
                onChange={e => setFilters({ ...filters, minProfit: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-sm rounded-lg bg-muted/40 border border-border focus:border-primary/50 outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Risque</label>
              <select value={filters.riskLevel} onChange={e => setFilters({ ...filters, riskLevel: e.target.value })}
                className="w-full px-3 py-1.5 text-sm rounded-lg bg-muted/40 border border-border focus:border-primary/50 outline-none">
                <option value="low">Faible</option>
                <option value="medium">Modéré</option>
                <option value="high">Élevé</option>
              </select>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <button onClick={handleSearch} disabled={loading}
              className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition disabled:opacity-50">
              <Search className="w-3.5 h-3.5" />
              {loading ? 'Analyse en cours...' : 'Lancer l\'analyse'}
            </button>
          </div>
        </div>

        {error && <div className="text-sm text-rose-400 border border-rose-500/20 bg-rose-500/5 px-4 py-2.5 rounded-lg">{error}</div>}

        {/* Résultats */}
        {searched && !loading && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <p className="text-sm font-medium">{results.length} résultat{results.length !== 1 ? 's' : ''}</p>
            </div>
            {results.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground text-center">Aucun résultat. Élargissez vos critères.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Produit</th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Marque</th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Catégorie</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground">Prix</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground">Marge</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground">Taux de rotation</th>
                    <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">Lien</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.map((deal, i) => (
                    <tr key={deal.id ?? i} className="hover:bg-muted/20 transition">
                      <td className="px-5 py-3">
                        <p className="font-medium truncate max-w-[220px]">{deal.title}</p>
                        {deal.whyNow && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[220px]">{deal.whyNow}</p>}
                      </td>
                      <td className="px-3 py-3"><span className="text-muted-foreground hover:text-primary transition cursor-pointer font-medium">{deal.brand}</span></td>
                      <td className="px-3 py-3 text-muted-foreground">{deal.category}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium">{deal.price}€</td>
                      <td className="px-3 py-3 text-right tabular-nums text-accent font-medium">{deal.profitMargin}%</td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{deal.demandScore}%</td>
                      <td className="px-5 py-3 text-right">
                        {deal.url ? (
                          <a href={deal.url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-border hover:bg-muted/50 transition text-muted-foreground hover:text-foreground">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : <span className="text-muted-foreground/30">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
