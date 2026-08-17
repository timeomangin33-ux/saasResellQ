'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { Fragment, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageHeader } from '@/components/ui/page-header'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { Magnetic } from '@/components/ui/magnetic'
import { RefreshCw, ExternalLink, ChevronDown, ChevronUp, Target, Loader2 } from 'lucide-react'

interface Opportunity {
  id: string
  title: string
  price: number
  brand: string
  category: string
  profitMargin: number
  demandScore: number
  estimatedProfit: number
  reason?: string
  prediction?: string
  score?: number
  url?: string
}

function normalizeOpportunities(value: unknown): Opportunity[] {
  if (Array.isArray(value)) return value as Opportunity[]
  if (value && typeof value === 'object') {
    const maybeList = (value as { opportunities?: unknown }).opportunities
    if (Array.isArray(maybeList)) return maybeList as Opportunity[]
  }
  return []
}

const CATEGORIES = ['Toutes', 'Femmes', 'Hommes', 'Chaussures', 'Electronique', 'Sacs & Accessoires', 'Sport', 'Maison']

type SortKey = 'profitMargin' | 'price' | 'demandScore'

function SortIcon({ k, sortKey, sortDir }: { k: SortKey; sortKey: SortKey; sortDir: 'asc' | 'desc' }) {
  return sortKey === k ? (sortDir === 'desc' ? <ChevronDown className="w-3 h-3 inline ml-0.5" /> : <ChevronUp className="w-3 h-3 inline ml-0.5" />) : null
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cat, setCat] = useState('Toutes')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<Record<string, string>>({})
  const [sortKey, setSortKey] = useState<SortKey>('profitMargin')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  async function load(category: string) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: category === 'Toutes' ? undefined : category, limit: 20 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Impossible de charger les données.')
      setOpportunities(normalizeOpportunities(data?.opportunities ?? data))
    } catch {
      try {
        const res = await fetch('/api/vinted/opportunities')
        const data = await res.json()
        setOpportunities(normalizeOpportunities(data?.opportunities ?? data))
      } catch {
        setError('Impossible de charger les données.')
      }
    } finally { setLoading(false) }
  }

  async function analyze(opp: Opportunity) {
    setAnalyzing(opp.id)
    try {
      const res = await fetch('/api/ai/product-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: opp.title, price: opp.price, brand: opp.brand, category: opp.category }),
      })
      const data = await res.json()
      setAnalysis(p => ({ ...p, [opp.id]: data.analysis || data.output || JSON.stringify(data) }))
    } catch {
      setAnalysis(p => ({ ...p, [opp.id]: 'Analyse indisponible.' }))
    } finally { setAnalyzing(null) }
  }

  useEffect(() => {
    if (!cat) return
    const id = window.setTimeout(() => { void load(cat) }, 0)
    return () => window.clearTimeout(id)
  }, [cat])

  const sorted = [...normalizeOpportunities(opportunities)].sort((a, b) => {
    const av = a[sortKey] ?? 0
    const bv = b[sortKey] ?? 0
    return sortDir === 'desc' ? bv - av : av - bv
  })

  const pluralS = sorted.length !== 1 ? 's' : ''

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        <PageHeader
          title="Opportunités"
          kicker="Deal finder"
          icon={Target}
          description="Produits sous-évalués avec fort potentiel de revente"
          actions={
            <Magnetic strength={0.2}>
              <button onClick={() => load(cat)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-lg transition hover:border-emerald-400/40">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualiser
              </button>
            </Magnetic>
          }
        />

        {/* Filtres catégorie */}
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${cat === c ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300' : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'}`}>
              {c}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-sm text-rose-400 border border-rose-500/20 bg-rose-500/5 px-4 py-2.5 rounded-lg">
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tableau */}
        <SpotlightCard spotlightColor="rgba(16,185,129,0.12)" className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <p className="text-sm font-medium">{sorted.length} opportunité{pluralS}</p>
            <p className="text-xs text-muted-foreground">Cliquez sur une ligne pour voir l'analyse</p>
          </div>
          {loading ? (
            <div className="divide-y divide-border">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="h-3 w-full overflow-hidden rounded bg-muted/40">
                    <motion.div
                      className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{ x: ['-100%', '400%'] }}
                      transition={{ duration: 1.3, repeat: Infinity, ease: 'linear', delay: i * 0.06 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <p className="px-5 py-10 text-sm text-muted-foreground text-center">Aucune opportunité disponible. Lancez le scraper Vinted.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Produit</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Marque</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Catégorie</th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('price')}>
                    Prix <SortIcon k="price" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('profitMargin')}>
                    Marge <SortIcon k="profitMargin" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('demandScore')}>
                    Taux de rotation <SortIcon k="demandScore" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground">Score IA</th>
                  <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((opp, index) => (
                  <Fragment key={opp.id}>
                    <motion.tr
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(index, 12) * 0.03 }}
                      whileHover={{ backgroundColor: 'rgba(16,185,129,0.05)' }}
                      className="cursor-pointer transition-colors"
                      onClick={() => setExpanded(expanded === opp.id ? null : opp.id)}
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium truncate max-w-[200px]">{opp.title}</p>
                      </td>
                      <td className="px-3 py-3"><span className="text-muted-foreground font-medium">{opp.brand}</span></td>
                      <td className="px-3 py-3 text-muted-foreground">{opp.category}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium">{opp.price}€</td>
                      <td className="px-3 py-3 text-right tabular-nums text-emerald-400 font-medium">{opp.profitMargin ?? opp.estimatedProfit}%</td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{opp.demandScore}%</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {opp.score != null ? <span className="text-emerald-300 font-medium">{opp.score}/10</span> : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                          <button onClick={() => analyze(opp)} disabled={analyzing === opp.id}
                            className="text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground transition disabled:opacity-50">
                            {analyzing === opp.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Analyser'}
                          </button>
                          {opp.url && (
                            <a href={opp.url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-border hover:bg-muted/50 transition text-muted-foreground hover:text-foreground">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                    <AnimatePresence>
                      {expanded === opp.id && (
                        <motion.tr
                          key={`${opp.id}-detail`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="bg-emerald-500/[0.03]"
                        >
                          <td colSpan={8} className="px-5 py-3 space-y-2">
                            {opp.prediction && <p className="text-xs text-muted-foreground"><span className="text-foreground font-medium">Prédiction :</span> {opp.prediction}</p>}
                            {opp.reason && <p className="text-xs text-muted-foreground"><span className="text-foreground font-medium">Raison :</span> {opp.reason}</p>}
                            {analysis[opp.id] && <p className="text-xs text-muted-foreground"><span className="text-foreground font-medium">Analyse IA :</span> {analysis[opp.id]}</p>}
                            {!opp.prediction && !opp.reason && !analysis[opp.id] && (
                              <p className="text-xs text-muted-foreground">Cliquez sur "Analyser" pour obtenir une analyse IA détaillée.</p>
                            )}
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </SpotlightCard>
      </div>
    </DashboardLayout>
  )
}
