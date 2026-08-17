'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { useSession } from 'next-auth/react'
import { normalizePlan } from '@/lib/plans'
import { PlanGate } from '@/components/plan-gate'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal, StaggerGroup, staggerItem } from '@/components/ui/reveal'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { Magnetic } from '@/components/ui/magnetic'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Zap, TrendingUp, AlertCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface Analysis {
  title: string
  brand: string
  category: string
  price: number
  estimatedResalePrice: number
  profitMargin: number
  demandScore: number
  riskLevel: string
  recommendation: string
  futurePrediction: string
  bestTimeToSell: string
  competitionLevel: string
  insights: string[]
}

export default function ProductAnalyzerPage() {
  const { data: session, status } = useSession()
  const planKey = normalizePlan(session?.user?.subscriptionPlan)
  const [form, setForm] = useState({ title: '', brand: '', category: '', price: '' })
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (status === 'loading') {
    return <div className="grid min-h-screen place-items-center bg-[#08080b]"><div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" /></div>
  }

  if (planKey === 'STARTER') {
    return (
      <DashboardLayout>
        <PlanGate planKey={planKey} minimumPlan="PRO" feature="Product Analyzer">
          <></>
        </PlanGate>
      </DashboardLayout>
    )
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setAnalysis(null)

    try {
      const res = await fetch('/api/ai/product-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, price: Number(form.price) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'analyse')
      setAnalysis(data.analysis || data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'analyse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <PageHeader
            title="Product Analyzer"
            kicker="Analyse IA"
            icon={Zap}
            description="Analyse approfondie d'un produit — rentabilité, demande, prédictions futures"
          />

          <SpotlightCard spotlightColor="rgba(16,185,129,0.14)">
            <motion.form onSubmit={handleAnalyze} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="panel p-8">
              <h2 className="text-xl font-bold mb-6">Informations du produit</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">Titre du produit *</label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required
                    placeholder="Ex: Nike Air Jordan 1 Retro High OG"
                    className="w-full px-4 py-3 rounded-xl bg-muted border border-border/50 focus:border-emerald-400/50 outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Marque</label>
                  <input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })}
                    placeholder="Ex: Nike"
                    className="w-full px-4 py-3 rounded-xl bg-muted border border-border/50 focus:border-emerald-400/50 outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Catégorie</label>
                  <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    placeholder="Ex: Chaussures"
                    className="w-full px-4 py-3 rounded-xl bg-muted border border-border/50 focus:border-emerald-400/50 outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Prix d'achat (€) *</label>
                  <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required
                    placeholder="Ex: 85"
                    className="w-full px-4 py-3 rounded-xl bg-muted border border-border/50 focus:border-emerald-400/50 outline-none transition-colors" />
                </div>
              </div>

              <Magnetic strength={0.12} className="mt-6 inline-block">
                <button type="submit" disabled={loading}
                  className="btn-shine flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-8 py-3 font-semibold text-white transition disabled:opacity-50">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  {loading ? 'Analyse en cours...' : 'Analyser ce produit'}
                </button>
              </Magnetic>
            </motion.form>
          </SpotlightCard>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-400">
                <AlertCircle className="w-5 h-5" /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {analysis && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="space-y-6">
                {/* Scores */}
                <StaggerGroup className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Prix achat', value: `€${analysis.price}`, color: 'bg-muted/50' },
                    { label: 'Prix revente', value: `€${analysis.estimatedResalePrice}`, color: 'bg-emerald-500/10 text-emerald-300' },
                    { label: 'Marge', value: `${analysis.profitMargin}%`, color: 'bg-cyan-500/10 text-cyan-300' },
                    { label: 'Demande', value: `${analysis.demandScore}%`, color: 'bg-violet-500/10 text-violet-300' },
                  ].map(stat => (
                    <motion.div key={stat.label} variants={staggerItem} whileHover={{ y: -3 }} className={`panel panel-hover rounded-2xl p-4 text-center ${stat.color}`}>
                      <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </motion.div>
                  ))}
                </StaggerGroup>

                {/* Recommandation */}
                <SpotlightCard spotlightColor="rgba(16,185,129,0.12)">
                  <Reveal className="panel p-6">
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-400" /> Recommandation IA
                    </h3>
                    <p className="text-muted-foreground">{analysis.recommendation}</p>
                  </Reveal>
                </SpotlightCard>

                {/* Prédiction future */}
                {analysis.futurePrediction && (
                  <Reveal delay={0.05} className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6">
                    <h3 className="text-lg font-bold mb-3 text-amber-400">🔮 Prédiction future</h3>
                    <p className="text-muted-foreground">{analysis.futurePrediction}</p>
                    {analysis.bestTimeToSell && (
                      <p className="mt-2 text-sm font-semibold text-amber-400">
                        ⏰ Meilleur moment pour vendre : {analysis.bestTimeToSell}
                      </p>
                    )}
                  </Reveal>
                )}

                {/* Insights */}
                {analysis.insights && analysis.insights.length > 0 && (
                  <Reveal delay={0.1} className="panel p-6">
                    <h3 className="text-lg font-bold mb-4">Insights détaillés</h3>
                    <StaggerGroup className="space-y-2">
                      {analysis.insights.map((insight, i) => (
                        <motion.li key={i} variants={staggerItem} className="flex items-start gap-2 px-4 py-3 rounded-xl bg-muted/50 text-sm list-none">
                          <span className="text-emerald-400">→</span> {insight}
                        </motion.li>
                      ))}
                    </StaggerGroup>
                  </Reveal>
                )}

                {/* Concurrence & Risque */}
                <div className="grid grid-cols-2 gap-4">
                  {analysis.competitionLevel && (
                    <div className="panel panel-hover rounded-2xl p-4">
                      <p className="text-sm text-muted-foreground mb-1">Niveau de concurrence</p>
                      <p className="font-bold">{analysis.competitionLevel}</p>
                    </div>
                  )}
                  {analysis.riskLevel && (
                    <div className="panel panel-hover rounded-2xl p-4">
                      <p className="text-sm text-muted-foreground mb-1">Niveau de risque</p>
                      <p className="font-bold">{analysis.riskLevel}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  )
}
