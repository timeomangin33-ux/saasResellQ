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
  totalPrice: number
  brand: string
  category: string
  size: string | null
  condition: string
  profitMargin: number | null
  estimatedProfit: number
  /** Favoris par jour depuis la mise en ligne. `null` si la date manque. */
  favouritesPerDay: number | null
  favouriteCount: number | null
  score: number | null
  url?: string | null
  seller?: string | null
  listedAt?: string | null
}

function normalizeOpportunities(value: unknown): Opportunity[] {
  if (Array.isArray(value)) return value as Opportunity[]
  if (value && typeof value === 'object') {
    const maybeList = (value as { opportunities?: unknown }).opportunities
    if (Array.isArray(maybeList)) return maybeList as Opportunity[]
  }
  return []
}

type SortKey = 'profitMargin' | 'price' | 'favouritesPerDay' | 'score'

/** Le vocabulaire interne des états, rendu lisible. */
const ETAT_LISIBLE: Record<string, string> = {
  new: 'Neuf',
  like_new: 'Très bon état',
  good: 'Bon état',
  fair: 'Satisfaisant',
}

/** Depuis quand l'annonce est en ligne, en clair. */
function depuis(iso: string | Date) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (!Number.isFinite(minutes) || minutes < 0) return '—'
  if (minutes < 60) return `${minutes} min`
  const heures = Math.round(minutes / 60)
  if (heures < 48) return `${heures} h`
  return `${Math.round(heures / 24)} j`
}

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
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [categories, setCategories] = useState<string[]>(['Toutes'])

  // Les catégories proposées sont celles que le robot suit réellement. La
  // liste était écrite en dur et ne correspondait plus : « Electronique » sans
  // accent, « Sport » au lieu de « Sport & Loisirs », « Maison » au lieu de
  // « Maison & Jardin ». Filtrer dessus ne rendait donc jamais rien.
  useEffect(() => {
    let vivant = true
    void (async () => {
      try {
        const res = await fetch('/api/vinted/top-categories')
        if (!res.ok) return
        const data = await res.json()
        const noms = (Array.isArray(data.categories) ? data.categories : [])
          .map((c: { name?: string; category?: string }) => c.name ?? c.category)
          .filter((n: unknown): n is string => typeof n === 'string' && n.length > 0)
        if (vivant && noms.length > 0) setCategories(['Toutes', ...noms])
      } catch {
        // La liste garde alors « Toutes » : on ne propose pas de filtres qu'on
        // ne sait pas honorer.
      }
    })()
    return () => { vivant = false }
  }, [])

  /**
   * Les opportunités viennent des annonces collectées, pas d'un agent externe.
   *
   * Cette page interrogeait `/api/ai/opportunities`, c'est-à-dire un agent n8n
   * qui n'est pas déployé : l'appel échouait à chaque chargement et la page ne
   * se rabattait sur les vraies données qu'en second recours, en silence. Le
   * classement, lui, venait donc rarement de ce que le robot avait mesuré.
   */
  async function load(category: string) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ limit: '40' })
      if (category && category !== 'Toutes') params.set('category', category)
      const res = await fetch(`/api/vinted/opportunities?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Impossible de charger les opportunités.')
      setOpportunities(normalizeOpportunities(data?.opportunities ?? data))
    } catch (err) {
      setOpportunities([])
      setError(err instanceof Error ? err.message : 'Impossible de charger les opportunités.')
    } finally {
      setLoading(false)
    }
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
      if (!res.ok) {
        // Un message précis vaut mieux que « indisponible » : la cause la plus
        // fréquente est un compte OpenAI sans crédit, et le savoir évite de
        // chercher ailleurs.
        throw new Error(data?.error || `L'analyse a répondu ${res.status}.`)
      }
      setAnalysis(p => ({ ...p, [opp.id]: data.analysis || data.output || JSON.stringify(data) }))
    } catch (err) {
      setAnalysis(p => ({ ...p, [opp.id]: err instanceof Error ? err.message : 'Analyse indisponible.' }))
    } finally { setAnalyzing(null) }
  }

  useEffect(() => {
    if (!cat) return
    const id = window.setTimeout(() => { void load(cat) }, 0)
    return () => window.clearTimeout(id)
  }, [cat])

  const sorted = [...normalizeOpportunities(opportunities)].sort((a, b) => {
    // Les valeurs inconnues finissent en bas dans les deux sens de tri : une
    // donnée manquante n'est pas une petite valeur.
    const av = a[sortKey]
    const bv = b[sortKey]
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
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
          {categories.map(c => (
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
            <p className="px-5 py-10 text-sm text-muted-foreground text-center">
              Aucune annonce notée dans cette sélection. Les notes sont calculées à chaque
              passage du robot : si la collecte vient d'être remise en route, patientez le
              temps d'un passage.
            </p>
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
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('favouritesPerDay')} title="Favoris par jour depuis la mise en ligne, tels que Vinted les affiche">
                    Demande <SortIcon k="favouritesPerDay" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('score')} title="Note sur 100 : marge, demande, état et fiabilité de la référence de prix">
                    Score <SortIcon k="score" sortKey={sortKey} sortDir={sortDir} />
                  </th>
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
                      <td className="px-3 py-3 text-right tabular-nums font-medium">
                        {opp.price}€
                        {opp.totalPrice > opp.price && (
                          <span className="block text-[11px] font-normal text-muted-foreground">{opp.totalPrice.toFixed(2)}€ frais inclus</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-emerald-400 font-medium">
                        {opp.profitMargin != null ? `${Math.round(opp.profitMargin)}%` : '—'}
                        {opp.estimatedProfit > 0 && (
                          <span className="block text-[11px] font-normal text-muted-foreground">≈ +{opp.estimatedProfit.toFixed(2)}€</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                        {/* Vide plutôt que zéro : une annonce dont on ignore la
                            date de mise en ligne n'est pas une annonce que
                            personne ne veut. */}
                        {opp.favouritesPerDay != null ? `${opp.favouritesPerDay} ♥/j` : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {opp.score != null ? <span className="text-emerald-300 font-medium">{Math.round(opp.score)}/100</span> : <span className="text-muted-foreground/40">—</span>}
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
                            {/* Ce qui a produit la note, et rien d'autre. La
                                ligne « Prédiction » qui s'affichait ici venait
                                d'un agent externe non déployé : elle était
                                toujours vide, et quand elle ne l'était pas,
                                elle annonçait l'avenir. */}
                            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                              <span><span className="text-foreground font-medium">État :</span> {ETAT_LISIBLE[opp.condition] ?? opp.condition}</span>
                              {opp.size && <span><span className="text-foreground font-medium">Taille :</span> {opp.size}</span>}
                              <span><span className="text-foreground font-medium">Coût réel :</span> {opp.totalPrice.toFixed(2)}€</span>
                              {opp.favouriteCount != null && (
                                <span><span className="text-foreground font-medium">Favoris :</span> {opp.favouriteCount}</span>
                              )}
                              {opp.listedAt && (
                                <span><span className="text-foreground font-medium">En ligne depuis :</span> {depuis(opp.listedAt)}</span>
                              )}
                              {opp.seller && <span><span className="text-foreground font-medium">Vendeur :</span> @{opp.seller}</span>}
                            </div>
                            <p className="text-[11px] text-muted-foreground/70">
                              Note calculée sur la médiane réelle de « {opp.brand} » dans « {opp.category} » :
                              marge, demande, état, et fiabilité de la comparaison.
                            </p>
                            {analysis[opp.id] && (
                              <p className="text-xs text-muted-foreground"><span className="text-foreground font-medium">Analyse IA :</span> {analysis[opp.id]}</p>
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
