'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { useSession } from 'next-auth/react'
import { normalizePlan } from '@/lib/plans'
import { PlanGate } from '@/components/plan-gate'
import { PageHeader } from '@/components/ui/page-header'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { Magnetic } from '@/components/ui/magnetic'
import { motion } from 'framer-motion'
import { Search, SlidersHorizontal, ExternalLink, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Deal {
  id: string
  title: string
  price: number
  totalPrice: number
  brand: string
  category: string
  condition: string
  profitMargin: number | null
  estimatedProfit: number
  favouritesPerDay: number | null
  score: number | null
  url?: string | null
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
  // `riskLevel` valait « medium » par défaut, ce qui appliquait en douce un
  // plancher de 40 % et un plafond de 60 % : le premier clic écartait les
  // meilleures annonces. Par défaut, seule la marge minimale saisie s'applique.
  const [filters, setFilters] = useState({ minBudget: 20, maxBudget: 300, category: '', riskLevel: 'low', minProfit: 30 })
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
    return <div className="grid min-h-screen place-items-center bg-[#08080b]"><div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" /></div>
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

  /**
   * La recherche interroge les annonces collectées.
   *
   * Elle passait d'abord par `/api/ai/deal-finder`, un agent n8n qui n'est pas
   * déployé : l'appel échouait systématiquement et le vrai jeu de données
   * n'arrivait qu'en second recours, sans que l'utilisateur sache lequel des
   * deux il regardait. Une seule source, celle qui existe.
   */
  // Le plancher effectivement envoyé à l'API : le plus haut des deux réglages.
  const PLANCHERS_MARGE: Record<string, number> = { low: 0, medium: 40, high: 60 }
  const margeRetenue = Math.max(filters.minProfit || 0, PLANCHERS_MARGE[filters.riskLevel] ?? 0)

  async function handleSearch() {
    setLoading(true)
    setError('')
    setSearched(true)
    try {
      const params = new URLSearchParams({ limit: '60' })
      params.set('minProfit', String(filters.minProfit))
      if (filters.category) params.set('category', filters.category)
      if (filters.riskLevel) params.set('riskLevel', filters.riskLevel)

      const res = await fetch(`/api/vinted/opportunities?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Impossible de charger les résultats.')

      // Le budget se filtre ici : c'est une contrainte de l'acheteur, pas une
      // propriété du marché, et elle porte sur le prix réellement payé.
      const dansLeBudget = (data.opportunities ?? []).filter(
        (d: Deal) => d.totalPrice >= filters.minBudget && d.totalPrice <= filters.maxBudget,
      )
      setResults(dansLeBudget)
    } catch (err) {
      setResults([])
      setError(err instanceof Error ? err.message : 'Impossible de charger les résultats.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        <PageHeader
          title="Deal Finder"
          kicker="Opportunités"
          icon={Search}
          description={topCategories.length > 0
            ? `Top catégories détectées : ${topCategories.slice(0, 8).map((category) => category.name).join(', ')}`
            : 'Détection des meilleures opportunités selon vos critères'}
        />

        {/* Filtres */}
        <SpotlightCard spotlightColor="rgba(16,185,129,0.12)">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="panel p-5">
            <div className="flex items-center gap-2 mb-4">
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-300" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Critères</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Budget min — {filters.minBudget}€</label>
                <input type="range" min="5" max="500" value={filters.minBudget}
                  onChange={e => setFilters({ ...filters, minBudget: Number(e.target.value) })}
                  className="w-full accent-emerald-400 h-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Budget max — {filters.maxBudget}€</label>
                <input type="range" min="10" max="1000" value={filters.maxBudget}
                  onChange={e => setFilters({ ...filters, maxBudget: Number(e.target.value) })}
                  className="w-full accent-emerald-400 h-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Catégorie</label>
                <select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm rounded-lg bg-muted/40 border border-border focus:border-emerald-400/50 outline-none transition-colors">
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
                  className="w-full px-3 py-1.5 text-sm rounded-lg bg-muted/40 border border-border focus:border-emerald-400/50 outline-none transition-colors" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Exigence de marge</label>
                <select value={filters.riskLevel} onChange={e => setFilters({ ...filters, riskLevel: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm rounded-lg bg-muted/40 border border-border focus:border-emerald-400/50 outline-none transition-colors">
                  <option value="low">Votre marge minimale seulement</option>
                  <option value="medium">Au moins 40 % de marge</option>
                  <option value="high">Au moins 60 % de marge</option>
                </select>
              </div>
            </div>
            {/* Le seuil réellement appliqué, écrit en clair : c'est le plus haut
                des deux réglages, et il n'y a aucun plafond. */}
            <p className="mt-3 text-xs text-muted-foreground">
              Marge retenue : au moins <strong className="text-foreground">{margeRetenue} %</strong> — les marges
              supérieures ne sont jamais écartées. Marge estimée à partir du prix demandé médian de la marque dans sa
              catégorie ; Vinted ne publie pas les prix de vente.
            </p>
            <div className="mt-4 pt-4 border-t border-border">
              <Magnetic strength={0.15} className="inline-block">
                <button onClick={handleSearch} disabled={loading}
                  className="btn-shine flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50">
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  {loading ? 'Analyse en cours...' : 'Lancer l\'analyse'}
                </button>
              </Magnetic>
            </div>
          </motion.div>
        </SpotlightCard>

        {error && <div className="text-sm text-rose-400 border border-rose-500/20 bg-rose-500/5 px-4 py-2.5 rounded-lg">{error}</div>}

        {/* Résultats */}
        {searched && !loading && (
          <SpotlightCard spotlightColor="rgba(16,185,129,0.12)">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="panel overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <p className="text-sm font-medium">{results.length} résultat{results.length !== 1 ? 's' : ''}</p>
              </div>
              {results.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted-foreground text-center">
                  Aucune annonce collectée ne correspond à ces critères. Élargissez le budget
                  ou baissez la marge minimale.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Produit</th>
                      <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Marque</th>
                      <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Catégorie</th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground">Prix</th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground">Marge</th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground" title="Favoris par jour depuis la mise en ligne">Demande</th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground">Score</th>
                      <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">Lien</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {results.map((deal, i) => (
                      <motion.tr key={deal.id ?? i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.5) }} whileHover={{ backgroundColor: 'rgba(16,185,129,0.05)' }} className="transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-medium truncate max-w-[220px]">{deal.title}</p>
                        </td>
                        <td className="px-3 py-3"><span className="text-muted-foreground font-medium">{deal.brand}</span></td>
                        <td className="px-3 py-3 text-muted-foreground">{deal.category}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-medium">
                          {deal.price}€
                          {deal.totalPrice > deal.price && (
                            <span className="block text-[11px] font-normal text-muted-foreground">{deal.totalPrice.toFixed(2)}€ frais inclus</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-emerald-400 font-medium">
                          {deal.profitMargin != null ? `${Math.round(deal.profitMargin)}%` : '—'}
                          {deal.estimatedProfit > 0 && (
                            <span className="block text-[11px] font-normal text-muted-foreground">≈ +{deal.estimatedProfit.toFixed(2)}€</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                          {deal.favouritesPerDay != null ? `${deal.favouritesPerDay} ♥/j` : <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {deal.score != null ? <span className="text-emerald-300 font-medium">{Math.round(deal.score)}/100</span> : <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {deal.url ? (
                            <a href={deal.url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-border hover:bg-muted/50 transition text-muted-foreground hover:text-foreground">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : <span className="text-muted-foreground/30">—</span>}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </motion.div>
          </SpotlightCard>
        )}
      </div>
    </DashboardLayout>
  )
}
