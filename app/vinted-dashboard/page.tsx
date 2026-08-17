'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Reveal } from '@/components/ui/reveal'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { Magnetic } from '@/components/ui/magnetic'
import { NumberTicker } from '@/components/ui/number-ticker'
import { ArrowRight, Loader2, RefreshCw, Sparkles, TrendingUp } from 'lucide-react'

export default function VintedDashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [analysisError, setAnalysisError] = useState('')

  const loadStats = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/vinted/dashboard')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Impossible de charger le tableau de bord Vinted.')
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    const run = async () => {
      if (!mounted) return
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/vinted/dashboard')
        const data = await res.json().catch(() => ({}))
        if (!mounted) return
        if (!res.ok) throw new Error(data.error || 'Impossible de charger le tableau de bord Vinted.')
        setStats(data)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
        setStats(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void run()
    return () => {
      mounted = false
    }
  }, [])

  const syncNow = async () => {
    setSyncing(true)
    setError('')
    try {
      const res = await fetch('/api/vinted/sync', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'La synchronisation a échoué.')
      await loadStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSyncing(false)
    }
  }

  const runAnalysis = async () => {
    setAnalyzing(true)
    setAnalysis(null)
    setAnalysisError('')
    try {
      const res = await fetch('/api/vinted/ai-analysis')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'L\'analyse a échoué.')
      if (data.ai) {
        setAnalysis(JSON.stringify(data.ai, null, 2))
      } else if (data.suggestions) {
        setAnalysis(data.suggestions.join(' '))
      } else {
        setAnalysis('Analyse terminée, mais le résultat est manquant.')
      }
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0d0f0e] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:p-8"
        >
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-14 -top-14 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px]"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="kicker">Vinted</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Tableau de bord Vinted</h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">Suivez vos ventes, synchronisez vos données et concentrez-vous sur les annonces les plus rentables.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Magnetic strength={0.15}>
                <button onClick={syncNow} disabled={syncing} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-60">
                  {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {syncing ? 'Synchronisation...' : 'Synchroniser'}
                </button>
              </Magnetic>
              <Magnetic strength={0.15}>
                <button onClick={runAnalysis} disabled={analyzing} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08] disabled:opacity-60">
                  <Sparkles className="h-4 w-4 text-emerald-300" />
                  {analyzing ? 'Analyse en cours...' : 'Analyse IA'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Magnetic>
            </div>
          </div>
        </motion.section>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
        ) : null}

        {analysisError ? (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{analysisError}</div>
        ) : null}

        {analysis ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-200">
            <p className="font-semibold text-white">Résultat de l'analyse IA</p>
            <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-zinc-300">{analysis}</pre>
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="h-24 overflow-hidden rounded-[24px] border border-white/10 bg-[#0d0f0e]">
                <motion.div
                  className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  animate={{ x: ['-100%', '400%'] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'linear', delay: index * 0.08 }}
                />
              </div>
            ))}
          </div>
        ) : !stats ? (
          <div className="mt-6 rounded-[28px] border border-dashed border-white/10 bg-[#0d0f0e] p-8 text-center text-sm text-zinc-400">Aucun compte Vinted lié pour le moment. Connectez votre compte depuis les paramètres pour démarrer.</div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <StatCard label="Chiffre d'affaires total" value={Math.round(stats.totalRevenue || 0)} suffix="€" />
              <StatCard label="Ventes totales" value={stats.totalSales || 0} />
              <StatCard label="Annonces actives" value={stats.activeListings || 0} />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <SpotlightCard spotlightColor="rgba(16,185,129,0.12)">
                <Reveal className="panel panel-hover p-6">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <TrendingUp className="h-4 w-4 text-emerald-300" />
                    Performance récente
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <MiniStat label="Aujourd'hui" value={`€${Math.round(stats.revenueToday || 0)}`} />
                    <MiniStat label="7 jours" value={`€${Math.round(stats.revenue7 || 0)}`} />
                    <MiniStat label="30 jours" value={`€${Math.round(stats.revenue30 || 0)}`} />
                  </div>
                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400">
                    Prix moyen de vente : <span className="font-semibold text-white">€{Math.round(stats.avgPrice || 0)}</span>
                  </div>
                </Reveal>
              </SpotlightCard>

              <SpotlightCard spotlightColor="rgba(16,185,129,0.12)">
                <Reveal delay={0.08} className="panel panel-hover p-6">
                  <p className="text-sm font-medium text-white">Analyse rapide</p>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Catégories</p>
                      <ul className="mt-2 space-y-2 text-sm text-zinc-300">
                        {(stats.topCategories || []).slice(0, 4).map((item: any, index: number) => (
                          <li key={`${item[0]}-${index}`} className="flex items-center justify-between"> <span>{item[0]}</span><span className="text-zinc-500">{item[1]} ventes</span></li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Marques</p>
                      <ul className="mt-2 space-y-2 text-sm text-zinc-300">
                        {(stats.topBrands || []).slice(0, 4).map((item: any, index: number) => (
                          <li key={`${item[0]}-${index}`} className="flex items-center justify-between"> <span>{item[0]}</span><span className="text-zinc-500">{item[1]} ventes</span></li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Reveal>
              </SpotlightCard>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

function StatCard({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
  return (
    <SpotlightCard spotlightColor="rgba(16,185,129,0.12)">
      <div className="panel panel-hover p-5">
        <p className="text-sm text-zinc-500">{label}</p>
        <p className="mt-3 text-2xl font-semibold text-white"><NumberTicker value={value} suffix={suffix} /></p>
      </div>
    </SpotlightCard>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}
