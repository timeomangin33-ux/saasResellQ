'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { useSession } from 'next-auth/react'
import { normalizePlan } from '@/lib/plans'
import { PlanGate } from '@/components/plan-gate'
import { Search, Zap, TrendingUp, AlertCircle } from 'lucide-react'
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
    return <div className="grid min-h-screen place-items-center bg-[#09090b]"><div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" /></div>
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
      if (!res.ok) throw new Error(data.error)
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
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Zap className="w-8 h-8 text-primary" />
              Product Analyzer
            </h1>
            <p className="text-muted-foreground">Analyse approfondie d'un produit — rentabilité, demande, prédictions futures</p>
          </div>

          <form onSubmit={handleAnalyze} className="rounded-3xl border border-border/50 bg-card p-8 shadow-card mb-8">
            <h2 className="text-xl font-bold mb-6">Informations du produit</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2">Titre du produit *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required
                  placeholder="Ex: Nike Air Jordan 1 Retro High OG"
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border/50 focus:border-primary/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Marque</label>
                <input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })}
                  placeholder="Ex: Nike"
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border/50 focus:border-primary/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Catégorie</label>
                <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  placeholder="Ex: Chaussures"
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border/50 focus:border-primary/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Prix d'achat (€) *</label>
                <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required
                  placeholder="Ex: 85"
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border/50 focus:border-primary/50 outline-none" />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="mt-6 flex items-center gap-2 bg-primary px-8 py-3 rounded-xl font-semibold text-white hover:bg-primary/90 transition disabled:opacity-50">
              <Search className="w-5 h-5" />
              {loading ? 'Analyse en cours...' : 'Analyser ce produit'}
            </button>
          </form>

          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-400 mb-6">
              <AlertCircle className="w-5 h-5" /> {error}
            </div>
          )}

          {analysis && (
            <div className="space-y-6">
              {/* Scores */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Prix achat', value: `€${analysis.price}`, color: 'bg-muted/50' },
                  { label: 'Prix revente', value: `€${analysis.estimatedResalePrice}`, color: 'bg-accent/10 text-accent' },
                  { label: 'Marge', value: `${analysis.profitMargin}%`, color: 'bg-blue-500/10 text-blue-400' },
                  { label: 'Demande', value: `${analysis.demandScore}%`, color: 'bg-purple-500/10 text-purple-400' },
                ].map(stat => (
                  <div key={stat.label} className={`rounded-2xl border border-border/50 p-4 text-center ${stat.color}`}>
                    <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Recommandation */}
              <div className="rounded-3xl border border-border/50 bg-card p-6">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" /> Recommandation IA
                </h3>
                <p className="text-muted-foreground">{analysis.recommendation}</p>
              </div>

              {/* Prédiction future */}
              {analysis.futurePrediction && (
                <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6">
                  <h3 className="text-lg font-bold mb-3 text-amber-400">🔮 Prédiction future</h3>
                  <p className="text-muted-foreground">{analysis.futurePrediction}</p>
                  {analysis.bestTimeToSell && (
                    <p className="mt-2 text-sm font-semibold text-amber-400">
                      ⏰ Meilleur moment pour vendre : {analysis.bestTimeToSell}
                    </p>
                  )}
                </div>
              )}

              {/* Insights */}
              {analysis.insights && analysis.insights.length > 0 && (
                <div className="rounded-3xl border border-border/50 bg-card p-6">
                  <h3 className="text-lg font-bold mb-4">Insights détaillés</h3>
                  <ul className="space-y-2">
                    {analysis.insights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2 px-4 py-3 rounded-xl bg-muted/50 text-sm">
                        <span className="text-primary">→</span> {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Concurrence & Risque */}
              <div className="grid grid-cols-2 gap-4">
                {analysis.competitionLevel && (
                  <div className="rounded-2xl border border-border/50 bg-card p-4">
                    <p className="text-sm text-muted-foreground mb-1">Niveau de concurrence</p>
                    <p className="font-bold">{analysis.competitionLevel}</p>
                  </div>
                )}
                {analysis.riskLevel && (
                  <div className="rounded-2xl border border-border/50 bg-card p-4">
                    <p className="text-sm text-muted-foreground mb-1">Niveau de risque</p>
                    <p className="font-bold">{analysis.riskLevel}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
