'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TrendingUp, BarChart2, ArrowUpRight, Zap, ShoppingBag, Lock } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

const chartData = [
  { day: 'Lun', value: 34 },
  { day: 'Mar', value: 42 },
  { day: 'Mer', value: 51 },
  { day: 'Jeu', value: 48 },
  { day: 'Ven', value: 58 },
  { day: 'Sam', value: 67 },
  { day: 'Dim', value: 73 },
]

const TABS = [
  { id: 'overview', label: "Vue d'ensemble" },
  { id: 'products', label: 'Produits' },
  { id: 'categories', label: 'Catégories' },
  { id: 'brands', label: 'Marques' },
]

const getMarginClass = (margin: number) =>
  margin >= 50 ? 'text-accent' : margin >= 35 ? 'text-amber-400' : 'text-rose-400'

export default function DemoDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">ResellQ Dashboard Preview</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Démo interactive • Données sensibles masquées</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-semibold flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Mode Démo
            </div>
            <Link href="/auth/signin" className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition">
              Se connecter
            </Link>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Tableau de bord</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Bonjour, Prospect — voir ci-dessous l'interface complète.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-medium bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full">
              Accès complet
            </span>
            <button className="text-xs font-medium bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition">
              Passer Pro
            </button>
          </div>
        </div>

        {/* Action Block */}
        <div className="rounded-3xl border border-border bg-card p-5 grid gap-4 md:grid-cols-[1fr_auto] items-center">
          <div>
            <p className="text-sm font-semibold">À acheter maintenant</p>
            <p className="text-xs text-muted-foreground mt-1">3 deals chauds sous-cotés détectés par ResellQ avec marge projetée en cash.</p>
          </div>
          <div className="rounded-2xl bg-[#08131F] px-4 py-2 text-right">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Potentiel</p>
            <p className="text-xl font-semibold text-accent">+410€</p>
            <p className="text-[11px] text-muted-foreground">valeur estimée aujourd'hui</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Opportunités du jour', value: '73', unit: '/100', delta: 'Marché favorable', up: true, icon: BarChart2 },
            { label: 'À lire maintenant', value: '3', unit: ' deals', delta: '+12%', up: true, icon: Zap },
            { label: 'Marge potentielle', value: '410', unit: '€', delta: '+14%', up: true, icon: TrendingUp },
            { label: 'Données fraîches', value: '2', unit: ' min', delta: 'Actualisé maintenant', up: null, icon: ShoppingBag },
          ].map(kpi => {
            const Icon = kpi.icon
            return (
              <div key={kpi.label} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <Icon className="w-3.5 h-3.5 text-muted-foreground/30" />
                </div>
                <p className="text-xl font-semibold tabular-nums">
                  {kpi.value}<span className="text-sm text-muted-foreground font-normal">{kpi.unit}</span>
                </p>
                <p className={`text-xs mt-1 ${kpi.up === true ? 'text-accent' : kpi.up === false ? 'text-rose-400' : 'text-muted-foreground'}`}>
                  {kpi.delta}
                </p>
              </div>
            )
          })}
        </div>

        {/* Tabs */}
        <div>
          <div className="flex border-b border-border mb-5 overflow-x-auto">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 text-sm rounded-full transition whitespace-nowrap ${activeTab === t.id ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid xl:grid-cols-3 gap-5">
              {/* Chart */}
              <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-sm font-medium">Indice de demande</p>
                    <p className="text-xs text-muted-foreground mt-0.5">7 derniers jours</p>
                  </div>
                  <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-full font-medium">+18%</span>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                      <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: '#0F1724', border: '1px solid #1F2937', borderRadius: '6px', fontSize: '11px' }} labelStyle={{ color: '#94A3B8' }} itemStyle={{ color: '#06B6D4' }} />
                      <Line type="monotone" dataKey="value" stroke="#06B6D4" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Quick links */}
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Navigation rapide</p>
                <div className="space-y-px">
                  {[
                    { label: 'Deal Finder', href: '/deal-finder', meta: 'Meilleures affaires' },
                    { label: 'Opportunités', href: '/opportunities', meta: 'Produits sous-évalués' },
                    { label: 'Analyse marché', href: '/market-research', meta: 'Études rapides' },
                    { label: 'Tendances', href: '/insights', meta: 'Évolutions & prédictions' },
                    { label: 'Assistant IA', href: '/ai-agent', meta: 'Briefing intelligent' },
                    { label: 'Rapports', href: '/reports', meta: 'Synthèses générées' },
                  ].map(item => (
                    <div key={item.href} className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-muted/40 transition group cursor-not-allowed opacity-70">
                      <div>
                        <p className="text-sm text-muted-foreground group-hover:text-muted-foreground transition-colors">{item.label}</p>
                        <p className="text-xs text-muted-foreground/60">{item.meta}</p>
                      </div>
                      <ArrowUpRight className="w-3 h-3 text-muted-foreground/30" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Products (Blurred) */}
              <div className="xl:col-span-2 bg-card border border-border rounded-xl overflow-hidden relative">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                  <p className="text-sm font-medium">Top produits</p>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Masqué en démo
                  </span>
                </div>
                <div className="divide-y divide-border blur-sm select-none pointer-events-none">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-2.5">
                      <span className="text-xs text-muted-foreground tabular-nums w-4">●●</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm bg-muted/30 rounded w-40 h-3 mb-1" />
                        <p className="text-xs bg-muted/30 rounded w-32 h-2" />
                      </div>
                      <div className="flex gap-6 flex-shrink-0 text-right">
                        <div className="w-12"><p className="text-sm bg-muted/30 rounded h-3 w-full" /></div>
                        <div className="w-12"><p className="text-sm bg-muted/30 rounded h-3 w-full" /></div>
                        <div className="w-16"><p className="text-sm bg-muted/30 rounded h-3 w-full" /></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background to-transparent">
                  <div className="text-center">
                    <Lock className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">Donn&eacute;es masqu&eacute;es</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Connectez-vous pour voir les résultats réels</p>
                  </div>
                </div>
              </div>

              {/* Categories (Blurred) */}
              <div className="bg-card border border-border rounded-xl overflow-hidden relative">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                  <p className="text-sm font-medium">Catégories hot</p>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Masqué
                  </span>
                </div>
                <div className="divide-y divide-border blur-sm select-none pointer-events-none">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-2.5">
                      <div>
                        <p className="text-sm font-medium bg-muted/30 rounded w-24 h-3 mb-1" />
                        <p className="text-xs bg-muted/30 rounded w-20 h-2" />
                      </div>
                      <p className="text-sm bg-muted/30 rounded w-12 h-3" />
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background to-transparent">
                  <div className="text-center">
                    <Lock className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">Données masquées</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Créez un compte gratuit</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other Tabs Placeholder */}
          {activeTab !== 'overview' && (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Contenu démo masqué</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Connectez-vous pour accéder à toutes les fonctionnalités</p>
            </div>
          )}
        </div>

        {/* CTA Section */}
        <div className="mt-12 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-primary/20 rounded-2xl p-8 text-center space-y-4">
          <h3 className="text-xl font-semibold">Prêt à démarrer ?</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Accédez à l'analyse complète des marchés, aux top 20 des catégories rentables, et à l'assistant IA en temps réel.
          </p>
          <div className="flex flex-col gap-3 justify-center pt-2 text-left sm:flex-row sm:text-center">
            <Link href="/auth/signup" className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition">
              Créer un compte
            </Link>
            <Link href="/auth/signin" className="px-6 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted/50 transition">
              Se connecter
            </Link>
          </div>
          <div className="mt-4 rounded-2xl border border-border bg-slate-950/40 p-4 text-xs text-slate-300">
            <p className="font-semibold text-white">Pour tester immédiatement :</p>
            <ul className="mt-2 space-y-2">
              <li>Starter : demo-starter@resellq.com / StarterDemo123!</li>
              <li>Pro : demo-pro@resellq.com / ProDemo123!</li>
              <li>Business : demo-business@resellq.com / BusinessDemo123!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

