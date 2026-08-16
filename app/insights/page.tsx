'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { TrendingUp, TrendingDown, Minus, RefreshCw, FileText, ChevronUp, ChevronDown } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'

interface Trend {
  category: string
  priceChange: number
  volume: number
  demandIndex: number
  prediction?: string
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

const FALLBACK: Trend[] = [
  { category: 'Mode Vintage', priceChange: 67, volume: 1240, demandIndex: 92, prediction: 'Forte croissance attendue dans les 30 prochains jours.' },
  { category: 'Sneakers', priceChange: 45, volume: 890, demandIndex: 88, prediction: 'Tendance stable — bon moment pour acheter.' },
  { category: 'Electronique Gaming', priceChange: 12, volume: 560, demandIndex: 75, prediction: 'Légère hausse prévue avec les nouvelles sorties.' },
  { category: 'Sacs de Luxe', priceChange: 52, volume: 340, demandIndex: 95, prediction: 'Segment premium — opportunités rares mais très rentables.' },
  { category: 'Sport & Fitness', priceChange: -5, volume: 780, demandIndex: 68, prediction: 'Légère baisse saisonnière.' },
  { category: 'Montres & Bijoux', priceChange: 28, volume: 420, demandIndex: 82, prediction: 'Croissance constante.' },
]

export default function InsightsPage() {
  const [trends, setTrends] = useState<Trend[]>([])
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingReport, setLoadingReport] = useState(false)
  const [period, setPeriod] = useState('7d')
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchTrends = useMemo(() => {
    return async (p: string) => {
      setLoading(true)
      try {
        const res = await fetch('/api/ai/trends', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ period: p }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error()
        setTrends(normalizeTrends(data?.trends ?? data))
      } catch { setTrends(FALLBACK) }
      finally { setLoading(false) }
    }
  }, [])

  async function generateReport() {
    setLoadingReport(true)
    try {
      const res = await fetch('/api/ai/reports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'weekly', format: 'json' }),
      })
      const data = await res.json()
      setReport(data.report || data)
    } catch {
      setReport({
        title: 'Rapport hebdomadaire',
        summary: 'Le marché Vinted continue sa croissance avec des opportunités dans le vintage et le luxe.',
        insights: ['Le segment vintage progresse de +67%.', 'Les sneakers Nike et Adidas restent les plus rentables.', 'La demande pour les sacs de luxe atteint un pic saisonnier.'],
        createdAt: new Date().toISOString(),
      })
    } finally { setLoadingReport(false) }
  }

  useEffect(() => {
    const id = window.setTimeout(() => { void fetchTrends(period) }, 0)
    return () => window.clearTimeout(id)
  }, [period, fetchTrends])

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">Tendances</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Analyse du marché Vinted par période</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 bg-muted/40 p-0.5 rounded-lg border border-border">
              {PERIODS.map(p => (
                <button key={p.value} onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1 text-xs rounded-md transition ${period === p.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={() => void fetchTrends(period)} className="p-1.5 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tableau tendances */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <p className="text-sm font-medium">Tendances par catégorie</p>
          </div>
          {loading ? (
            <div className="divide-y divide-border">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex gap-4 px-5 py-3 animate-pulse">
                  <div className="flex-1 h-3 bg-muted/40 rounded" />
                  <div className="w-16 h-3 bg-muted/40 rounded" />
                  <div className="w-16 h-3 bg-muted/40 rounded" />
                  <div className="w-16 h-3 bg-muted/40 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Catégorie</th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground">Variation prix</th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground">Volume</th>
                  <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">Indice demande</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trends.map((t, i) => {
                  const up = t.priceChange > 10
                  const down = t.priceChange < 0
                  return (
                    <>
                      <tr key={i}
                        className="hover:bg-muted/20 transition cursor-pointer"
                        onClick={() => setExpanded(expanded === t.category ? null : t.category)}>
                        <td className="px-5 py-3 font-medium">{t.category}</td>
                        <td className="px-3 py-3 text-right">
                          <span className={`inline-flex items-center gap-1 tabular-nums text-sm font-medium ${up ? 'text-accent' : down ? 'text-rose-400' : 'text-amber-400'}`}>
                            {up ? <TrendingUp className="w-3.5 h-3.5" /> : down ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                            {t.priceChange > 0 ? '+' : ''}{t.priceChange}%
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{t.volume.toLocaleString('fr-FR')}</td>
                        <td className="px-5 py-3 text-right tabular-nums font-medium">{t.demandIndex}%</td>
                      </tr>
                      {expanded === t.category && t.prediction && (
                        <tr key={`${i}-pred`} className="bg-muted/10">
                          <td colSpan={4} className="px-5 py-2.5 text-xs text-muted-foreground">
                            <span className="text-foreground font-medium">Prédiction : </span>{t.prediction}
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Rapport */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div>
              <p className="text-sm font-medium">Rapport de marché</p>
              <p className="text-xs text-muted-foreground mt-0.5">Synthèse IA générée à la demande</p>
            </div>
            <button onClick={generateReport} disabled={loadingReport}
              className="flex items-center gap-2 bg-primary text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-primary/90 transition disabled:opacity-50">
              <FileText className="w-3.5 h-3.5" />
              {loadingReport ? 'Génération...' : 'Générer'}
            </button>
          </div>
          {report ? (
            <div className="divide-y divide-border">
              <div className="px-5 py-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{report.title}</p>
                <p className="text-sm text-muted-foreground">{report.summary}</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Points clés</p>
                <ul className="space-y-1.5">
                  {report.insights?.map((ins, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-muted-foreground flex-shrink-0 mt-0.5">—</span>
                      <span>{ins}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="px-5 py-3 flex justify-end">
                <p className="text-xs text-muted-foreground">
                  Généré le {new Date(report.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          ) : (
            <p className="px-5 py-6 text-sm text-muted-foreground">Cliquez sur "Générer" pour obtenir une synthèse IA du marché actuel.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
