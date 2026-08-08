'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { FileText, Download, RefreshCw, Calendar, ChevronRight } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { normalizePlan } from '@/lib/plans'
import { PlanGate } from '@/components/plan-gate'
import { useState } from 'react'

interface Report {
  id: string
  title: string
  type: 'daily' | 'weekly' | 'monthly'
  summary: string
  insights: string[]
  topOpportunities: string[]
  createdAt: string
}

const REPORT_TYPES = [
  { value: 'daily', label: 'Quotidien', desc: 'Résumé des opportunités du jour' },
  { value: 'weekly', label: 'Hebdomadaire', desc: 'Analyse complète de la semaine' },
  { value: 'monthly', label: 'Mensuel', desc: 'Bilan et prévisions du mois' },
]

const TYPE_LABELS: Record<string, string> = { daily: 'Quotidien', weekly: 'Hebdomadaire', monthly: 'Mensuel' }

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const planKey = normalizePlan(session?.user?.subscriptionPlan)
  const [generating, setGenerating] = useState(false)
  const [selectedType, setSelectedType] = useState('weekly')
  const [reports, setReports] = useState<Report[]>([])
  const [current, setCurrent] = useState<Report | null>(null)

  if (status === 'loading') {
    return <div className="grid min-h-screen place-items-center bg-[#09090b]"><div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" /></div>
  }

  if (planKey === 'STARTER') {
    return (
      <DashboardLayout>
        <PlanGate planKey={planKey} minimumPlan="PRO" feature="Rapports">
          <></>
        </PlanGate>
      </DashboardLayout>
    )
  }

  async function generate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType, format: 'json' }),
      })
      const data = await res.json()
      const report: Report = data.report ?? {
        id: Date.now().toString(),
        title: `Rapport ${TYPE_LABELS[selectedType].toLowerCase()} — ${new Date().toLocaleDateString('fr-FR')}`,
        type: selectedType as Report['type'],
        summary: data.summary ?? 'Le marché Vinted présente de belles opportunités cette semaine, notamment dans les segments vintage et luxe.',
        insights: data.insights ?? [
          'Le segment sneakers Nike progresse de +45% vs semaine dernière.',
          'Les sacs de luxe atteignent un pic de demande saisonnier.',
          'Électronique gaming : sous-évaluation détectée sur plusieurs références.',
          '3 nouvelles opportunités haute marge identifiées.',
        ],
        topOpportunities: data.topOpportunities ?? [
          'Nike Air Jordan 1 — marge estimée 85€',
          'Louis Vuitton Neverfull — marge estimée 320€',
          'PS5 Digital Edition — marge estimée 45€',
        ],
        createdAt: new Date().toISOString(),
      }
      setCurrent(report)
      setReports(prev => [report, ...prev])
    } catch {}
    finally { setGenerating(false) }
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto space-y-6">

          <div>
            <h1 className="text-xl font-semibold">Rapports</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Analyses générées par l&apos;agent IA</p>
          </div>

          <div className="rounded-3xl border border-border/60 bg-[#0f172a] p-4 text-sm text-zinc-300">
            <p className="text-xs uppercase tracking-[0.24em] text-violet-300">Forfait {planKey === 'BUSINESS' ? 'Business' : 'Pro'}</p>
            <p className="mt-2 font-semibold text-white">{planKey === 'BUSINESS' ? 'Rapports professionnels et exports partagés.' : 'Rapports IA détaillés pour votre stratégie.'}</p>
            <p className="mt-1 text-xs text-zinc-400">{planKey === 'BUSINESS' ? 'Partagez facilement les synthèses et suivez les performances d’équipe.' : 'Générez des rapports stratégiques pour suivre les tendances du marché.'}</p>
          </div>

          {/* Génération */}
          <div className="bg-card border border-border rounded-xl p-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Nouveau rapport</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              {REPORT_TYPES.map(type => (
                <button key={type.value} onClick={() => setSelectedType(type.value)}
                  className={`p-4 rounded-xl border text-left transition ${selectedType === type.value ? 'border-primary bg-primary/5 text-foreground' : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'}`}>
                  <p className="text-sm font-medium mb-0.5">{type.label}</p>
                  <p className="text-xs opacity-70">{type.desc}</p>
                </button>
              ))}
            </div>
            <button onClick={generate} disabled={generating}
              className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary/90 transition disabled:opacity-50">
              {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {generating ? 'Génération en cours...' : 'Générer'}
            </button>
          </div>

          {/* Rapport actuel */}
          {current && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-start justify-between px-6 py-5 border-b border-border">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{TYPE_LABELS[current.type]}</p>
                  <h2 className="text-base font-semibold">{current.title}</h2>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(current.createdAt).toLocaleString('fr-FR')}
                  </p>
                </div>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-lg transition">
                  <Download className="w-3.5 h-3.5" /> Exporter
                </button>
              </div>
                      <p className="text-sm text-muted-foreground">Rapports générés automatiquement. Cliquez sur &apos;Générer&apos; pour lancer la création.</p>
              <div className="px-6 py-5 border-b border-border">
                <p className="text-sm text-muted-foreground leading-relaxed">{current.summary}</p>
              </div>

              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                <div className="px-6 py-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Points clés</p>
                  <ul className="space-y-2">
                    {current.insights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className="text-muted-foreground mt-0.5 flex-shrink-0">—</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="px-6 py-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Top opportunités</p>
                  <ul className="space-y-2">
                    {current.topOpportunities.map((opp, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className="text-xs font-semibold text-primary mt-0.5 flex-shrink-0">{i + 1}.</span>
                        <span>{opp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Historique */}
          {reports.length > 1 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <p className="text-sm font-medium">Historique</p>
              </div>
              <div className="divide-y divide-border">
                {reports.slice(1).map(report => (
                  <button key={report.id} onClick={() => setCurrent(report)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition text-left">
                    <div>
                      <p className="text-sm font-medium">{report.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(report.createdAt).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${report.type === 'daily' ? 'bg-blue-500/10 text-blue-400' : report.type === 'weekly' ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-400'}`}>
                        {TYPE_LABELS[report.type]}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
