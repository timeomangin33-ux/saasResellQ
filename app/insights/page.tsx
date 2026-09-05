'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/ui/page-header'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { Magnetic } from '@/components/ui/magnetic'
import { TrendingUp, TrendingDown, Minus, RefreshCw, FileText, Loader2 } from 'lucide-react'
import { Fragment, useEffect, useState, useMemo } from 'react'

interface Trend {
  category: string
  /** Variation du prix moyen sur la période. `null` = pas assez d'historique. */
  priceChange: number | null
  volume: number
  /** Part des annonces qui intéressent quelqu'un. `null` si non mesurable. */
  demandIndex: number | null
  avgPrice: number | null
  medianPrice: number | null
  p25Price?: number | null
  p75Price?: number | null
  priceSample?: number | null
  /** Nombre de points d'historique derrière la variation. */
  historyPoints: number
  /** up | down | stable | inconnue — calculé sur fenêtres, avec zone morte. */
  trendDirection?: string
  historyDays?: number | null
  /** Part des annonces suivies disparues en moins de 7 jours. */
  sellThroughRate?: number | null
  sellThroughSample?: number | null
  medianDaysToDisappear?: number | null
  confidence?: 'confirme' | 'en-mesure' | 'insuffisant' | string
  qualityNote?: string | null
  lastSweepAt?: string | null
}

/**
 * Repère de fiabilité, identique à celui de la page Catégories.
 *
 * Volontairement le même vocabulaire aux deux endroits : deux mots différents
 * pour la même notion obligent le lecteur à retenir une correspondance, et il
 * finit par ignorer les deux.
 */
const CONFIANCE: Record<string, { texte: string; classe: string }> = {
  confirme: { texte: 'confirmée', classe: 'text-emerald-400' },
  'en-mesure': { texte: 'en cours', classe: 'text-amber-400' },
  insuffisant: { texte: 'trop peu de recul', classe: 'text-muted-foreground/60' },
}

interface Report { title: string; summary: string; insights: string[]; createdAt: string }

function normalizeTrends(value: unknown): Trend[] {
  if (Array.isArray(value)) return value as Trend[]
  if (value && typeof value === 'object') {
    const maybeTrends = (value as { trends?: unknown }).trends
    if (Array.isArray(maybeTrends)) return maybeTrends as Trend[]
  }
  return []
}

const PERIODS = [{ value: '7d', label: '7 jours' }, { value: '30d', label: '30 jours' }, { value: '90d', label: '3 mois' }]

export default function InsightsPage() {
  const [trends, setTrends] = useState<Trend[]>([])
  const [trendsError, setTrendsError] = useState<string | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingReport, setLoadingReport] = useState(false)
  const [period, setPeriod] = useState('7d')
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchTrends = useMemo(() => {
    return async (p: string) => {
      setLoading(true)
      setTrendsError(null)
      try {
        const res = await fetch('/api/ai/trends', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ period: p }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Impossible de charger les tendances.')
        setTrends(normalizeTrends(data.trends))
      } catch (e) {
        setTrends([])
        setTrendsError(e instanceof Error ? e.message : 'Erreur inconnue.')
      } finally {
        setLoading(false)
      }
    }
  }, [])

  async function generateReport() {
    setLoadingReport(true)
    setReportError(null)
    try {
      const res = await fetch('/api/ai/reports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'weekly', format: 'json' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.report) throw new Error(data.error || 'La génération du rapport a échoué.')
      setReport(data.report)
    } catch (e) {
      setReportError(e instanceof Error ? e.message : 'Erreur inconnue.')
    } finally {
      setLoadingReport(false)
    }
  }

  useEffect(() => {
    const id = window.setTimeout(() => { void fetchTrends(period) }, 0)
    return () => window.clearTimeout(id)
  }, [period, fetchTrends])

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        <PageHeader
          title="Tendances"
          kicker="Market insights"
          icon={TrendingUp}
          description="Analyse du marché Vinted par période"
          actions={
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
                {PERIODS.map(p => (
                  <button key={p.value} onClick={() => setPeriod(p.value)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${period === p.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
              <Magnetic strength={0.2}>
                <button onClick={() => void fetchTrends(period)} className="rounded-lg border border-border p-1.5 text-muted-foreground transition hover:border-emerald-400/40 hover:text-foreground">
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </Magnetic>
            </div>
          }
        />

        {/* Tableau tendances */}
        <SpotlightCard spotlightColor="rgba(16,185,129,0.12)">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="panel overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <p className="text-sm font-medium">Tendances par catégorie</p>
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
            ) : trendsError ? (
              <p className="px-5 py-8 text-center text-sm text-red-400">{trendsError}</p>
            ) : trends.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">Aucune tendance disponible pour cette période.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Catégorie</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground">Variation prix</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground">Volume</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground">Rotation 7 j</th>
                    <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">Indice demande</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {trends.map((t, i) => {
                    // Une variation inconnue n'est pas une variation nulle :
                    // deux jours d'historique ne disent rien d'une tendance, et
                    // afficher « 0 % » les ferait passer pour un marché stable.
                    // La direction vient du calcul stabilisé côté serveur —
                    // fenêtres de plusieurs jours et zone morte — et non d'un
                    // seuil réappliqué ici sur la variation. Deux seuils pour
                    // une même flèche, c'est la garantie qu'un jour l'un dira
                    // « hausse » pendant que l'autre affiche du orange.
                    const inconnue = t.priceChange === null || t.trendDirection === 'inconnue'
                    const up = t.trendDirection === 'up'
                    const down = t.trendDirection === 'down'
                    const confiance = CONFIANCE[t.confidence ?? 'insuffisant'] ?? CONFIANCE.insuffisant
                    // La clé était portée par le <tr> intérieur au lieu du
                    // fragment : React réclamait une clé par ligne rendue.
                    return (
                      <Fragment key={t.category || i}>
                        <tr
                          className="cursor-pointer transition-colors hover:bg-emerald-500/[0.05]"
                          onClick={() => setExpanded(expanded === t.category ? null : t.category)}>
                          <td className="px-5 py-3 font-medium">{t.category}</td>
                          <td className="px-3 py-3 text-right">
                            {inconnue ? (
                              <span className="text-xs text-muted-foreground/60">pas assez d'historique</span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 tabular-nums text-sm font-medium ${up ? 'text-emerald-400' : down ? 'text-rose-400' : 'text-amber-400'}`}>
                                {up ? <TrendingUp className="w-3.5 h-3.5" /> : down ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                                {t.priceChange! > 0 ? '+' : ''}{t.priceChange}%
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{t.volume.toLocaleString('fr-FR')}</td>
                          <td className="px-3 py-3 text-right tabular-nums">
                            {t.sellThroughRate === null || t.sellThroughRate === undefined ? (
                              <span className="text-xs text-muted-foreground/60">mesure en cours</span>
                            ) : (
                              <span
                                className={`font-medium ${
                                  t.sellThroughRate >= 0.35
                                    ? 'text-emerald-400'
                                    : t.sellThroughRate >= 0.15
                                      ? 'text-amber-400'
                                      : 'text-rose-400'
                                }`}
                              >
                                {Math.round(t.sellThroughRate * 100)}%
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums font-medium">
                            {t.demandIndex === null ? <span className="text-muted-foreground/40">—</span> : `${t.demandIndex}%`}
                          </td>
                        </tr>
                        {expanded === t.category && (
                          <tr className="bg-emerald-500/[0.03]">
                            <td colSpan={5} className="space-y-1 px-5 py-2.5 text-xs text-muted-foreground">
                              <p>
                                Prix demandé médian {t.medianPrice?.toFixed(2) ?? '—'} €
                                {t.p25Price != null && t.p75Price != null
                                  ? ` · moitié des annonces entre ${Math.round(t.p25Price)} et ${Math.round(t.p75Price)} €`
                                  : ''}
                                {t.priceSample ? ` · relevé sur ${t.priceSample} annonces récentes` : ''} ·{' '}
                                {t.volume.toLocaleString('fr-FR')} annonces suivies · fiabilité{' '}
                                <span className={confiance.classe}>{confiance.texte}</span>
                              </p>
                              <p>{t.qualityNote ?? 'Mesure en cours.'}</p>
                              <p className="text-muted-foreground/70">
                                {t.medianDaysToDisappear != null
                                  ? `Délai médian avant retrait ${t.medianDaysToDisappear.toFixed(1)} jour(s). `
                                  : ''}
                                Rotation vérifiée annonce par annonce, sept jours après la première vue. « Plus en
                                vente » veut dire vendue ou retirée : Vinted ne publie pas les transactions, donc tous
                                les prix affichés sont des prix demandés.
                              </p>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            )}
          </motion.div>
        </SpotlightCard>

        {/* Rapport */}
        <SpotlightCard spotlightColor="rgba(16,185,129,0.12)">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }} className="panel overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <div>
                <p className="text-sm font-medium">Rapport de marché</p>
                <p className="text-xs text-muted-foreground mt-0.5">Synthèse IA générée à la demande</p>
              </div>
              <Magnetic strength={0.15}>
                <button onClick={generateReport} disabled={loadingReport}
                  className="btn-shine flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary/90 disabled:opacity-50">
                  {loadingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  {loadingReport ? 'Génération...' : 'Générer'}
                </button>
              </Magnetic>
            </div>
            {reportError && (
              <p className="px-5 py-4 text-sm text-red-400">{reportError}</p>
            )}
            {report ? (
              <div className="divide-y divide-border">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="px-5 py-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{report.title}</p>
                  <p className="text-sm text-muted-foreground">{report.summary}</p>
                </motion.div>
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Points clés</p>
                  <ul className="space-y-1.5">
                    {report.insights?.map((ins, i) => (
                      <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }} className="flex gap-2 text-sm">
                        <span className="text-emerald-400 flex-shrink-0 mt-0.5">—</span>
                        <span>{ins}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
                <div className="px-5 py-3 flex justify-end">
                  <p className="text-xs text-muted-foreground">
                    Généré le {new Date(report.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ) : !reportError ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Cliquez sur "Générer" pour obtenir une synthèse IA du marché actuel.</p>
            ) : null}
          </motion.div>
        </SpotlightCard>
      </div>
    </DashboardLayout>
  )
}
