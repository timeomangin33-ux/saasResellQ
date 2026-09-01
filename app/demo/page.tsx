'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { TrendingUp, BarChart2, ArrowUpRight, Zap, ShoppingBag, Lock } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Reveal, StaggerGroup, staggerItem } from '@/components/ui/reveal'
import { Magnetic } from '@/components/ui/magnetic'

/**
 * Les chiffres de cette page viennent de `/api/public/demo`, c'est-à-dire des
 * annonces réellement collectées.
 *
 * Ils étaient auparavant écrits en dur — « 73/100 », « +410 € », « +18 % » et
 * une courbe de sept points inventée. Un visiteur les prenait pour la
 * production du produit, alors qu'ils ne mesuraient rien et ne changeaient
 * jamais. Une démonstration qui ment sur ce qu'elle montre est un mauvais
 * argument de vente, et un mauvais départ.
 */
interface ChiffresPublics {
  annoncesSuivies: number | null
  categoriesSuivies: number | null
  opportunites: number | null
  gainTop10: number | null
  ageMinutes: number | null
  courbe: { day: string; value: number }[]
  variationVolume: number | null
  seuilOpportunite: number
}

function fraicheur(minutes: number | null) {
  if (minutes === null) return '—'
  if (minutes < 60) return `${minutes} min`
  const heures = Math.round(minutes / 60)
  if (heures < 48) return `${heures} h`
  return `${Math.round(heures / 24)} j`
}

const TABS = [
  { id: 'overview', label: "Vue d\'ensemble" },
  { id: 'products', label: 'Produits' },
  { id: 'categories', label: 'Catégories' },
  { id: 'brands', label: 'Marques' },
]

const getMarginClass = (margin: number) =>
  margin >= 50 ? 'text-accent' : margin >= 35 ? 'text-amber-400' : 'text-rose-400'

export default function DemoDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [chiffres, setChiffres] = useState<ChiffresPublics | null>(null)

  useEffect(() => {
    let vivant = true
    void (async () => {
      try {
        const res = await fetch('/api/public/demo')
        if (!res.ok) return
        const data = (await res.json()) as ChiffresPublics
        if (vivant) setChiffres(data)
      } catch {
        // La page reste lisible sans les chiffres : elle affiche « — » plutôt
        // que de les inventer.
      }
    })()
    return () => { vivant = false }
  }, [])

  const chartData = chiffres?.courbe ?? []

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/[0.08] bg-[#0a0a0e]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Aperçu du tableau de bord ResellQ</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Démo interactive • Données sensibles masquées</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="chip text-amber-300">
              <Lock className="w-3 h-3" />
              Mode Démo
            </div>
            <Magnetic strength={0.2}>
              <Link href="/auth/signin" className="btn-shine rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90">
                Se connecter
              </Link>
            </Magnetic>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Tableau de bord</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Bonjour, Prospect — voir ci-dessous l'interface complète.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-medium bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full">
              Aperçu limité
            </span>
            <Magnetic strength={0.2}>
              <Link href="/pricing" className="btn-shine inline-block rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary/90">
                Voir les forfaits
              </Link>
            </Magnetic>
          </div>
        </motion.div>

        {/* Action Block */}
        <Reveal className="panel-strong grid gap-4 p-5 md:grid-cols-[1fr_auto] items-center">
          <div>
            <p className="text-sm font-semibold">Ce que le robot voit en ce moment</p>
            <p className="text-xs text-muted-foreground mt-1">
              {chiffres?.opportunites != null
                ? `${chiffres.opportunites.toLocaleString('fr-FR')} annonce${chiffres.opportunites > 1 ? 's' : ''} au-dessus de ${chiffres.seuilOpportunite}/100, sur ${(chiffres.annoncesSuivies ?? 0).toLocaleString('fr-FR')} suivies en direct.`
                : 'Chargement des chiffres du marché…'}
            </p>
          </div>
          <div className="rounded-2xl bg-[#08131F] px-4 py-2 text-right">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Top 10</p>
            <p className="text-xl font-semibold text-accent">
              {chiffres?.gainTop10 != null ? `+${chiffres.gainTop10.toLocaleString('fr-FR')}€` : '—'}
            </p>
            <p className="text-[11px] text-muted-foreground">gain estimé sur les 10 meilleures</p>
          </div>
        </Reveal>

        {/* KPIs */}
        <StaggerGroup className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: 'Annonces suivies',
              value: chiffres?.annoncesSuivies?.toLocaleString('fr-FR') ?? '—',
              unit: '',
              delta: `${chiffres?.categoriesSuivies ?? '—'} catégories`,
              up: null,
              icon: BarChart2,
            },
            {
              label: `Notées au-dessus de ${chiffres?.seuilOpportunite ?? 70}`,
              value: chiffres?.opportunites?.toLocaleString('fr-FR') ?? '—',
              unit: '',
              delta: 'sur 100 points',
              up: null,
              icon: Zap,
            },
            {
              label: 'Gain estimé, top 10',
              value: chiffres?.gainTop10?.toLocaleString('fr-FR') ?? '—',
              unit: '€',
              delta: 'revente au prix médian',
              up: null,
              icon: TrendingUp,
            },
            {
              label: 'Dernière collecte',
              value: fraicheur(chiffres?.ageMinutes ?? null),
              unit: '',
              // Le mot « frais » n'est mérité qu'en dessous de trois heures :
              // au-delà, on le dit.
              delta: chiffres?.ageMinutes != null && chiffres.ageMinutes > 180 ? 'données en retard' : 'à jour',
              up: chiffres?.ageMinutes != null && chiffres.ageMinutes > 180 ? false : null,
              icon: ShoppingBag,
            },
          ].map(kpi => {
            const Icon = kpi.icon
            return (
              <motion.div key={kpi.label} variants={staggerItem} className="panel panel-hover p-4">
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
              </motion.div>
            )
          })}
        </StaggerGroup>

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
            <StaggerGroup className="grid xl:grid-cols-3 gap-5">
              {/* Chart */}
              <motion.div variants={staggerItem} className="xl:col-span-2 panel p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-sm font-medium">Annonces suivies</p>
                    <p className="text-xs text-muted-foreground mt-0.5">7 derniers jours, toutes catégories</p>
                  </div>
                  {chiffres?.variationVolume != null && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${chiffres.variationVolume >= 0 ? 'text-accent bg-accent/10' : 'text-rose-400 bg-rose-500/10'}`}>
                      {chiffres.variationVolume > 0 ? '+' : ''}{chiffres.variationVolume}%
                    </span>
                  )}
                </div>
                <div className="h-48">
                  {chartData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      Pas encore assez d&apos;historique pour tracer une courbe.
                    </div>
                  ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                      <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: '#0F1724', border: '1px solid #1F2937', borderRadius: '6px', fontSize: '11px' }} labelStyle={{ color: '#94A3B8' }} itemStyle={{ color: '#06B6D4' }} />
                      <Line type="monotone" dataKey="value" stroke="#06B6D4" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  )}
                </div>
              </motion.div>

              {/* Quick links */}
              <motion.div variants={staggerItem} className="panel p-5">
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
              </motion.div>

              {/* Top Products (Blurred) */}
              <motion.div variants={staggerItem} className="xl:col-span-2 panel overflow-hidden relative">
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
              </motion.div>

              {/* Categories (Blurred) */}
              <motion.div variants={staggerItem} className="panel overflow-hidden relative">
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
              </motion.div>
            </StaggerGroup>
          )}

          {/* Other Tabs Placeholder */}
          {activeTab !== 'overview' && (
            <Reveal className="panel p-12 text-center">
              <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Contenu démo masqué</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Connectez-vous pour accéder à toutes les fonctionnalités</p>
            </Reveal>
          )}
        </div>

        {/* CTA Section */}
        <Reveal className="mt-12 panel-strong border-primary/20 p-8 text-center space-y-4">
          <h3 className="text-xl font-semibold">Prêt à démarrer ?</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Accédez à l'analyse complète des marchés, aux top 20 des catégories rentables, et à l'assistant IA en temps réel.
          </p>
          <div className="flex flex-col gap-3 justify-center pt-2 text-left sm:flex-row sm:text-center">
            <Magnetic strength={0.2}>
              <Link href="/auth/signup" className="btn-shine inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90">
                Créer un compte
              </Link>
            </Magnetic>
            <Magnetic strength={0.2}>
              <Link href="/auth/signin" className="inline-block rounded-lg border border-border px-6 py-2.5 text-sm font-semibold transition hover:bg-muted/50">
                Se connecter
              </Link>
            </Magnetic>
          </div>
        </Reveal>
      </div>
    </div>
  )
}

