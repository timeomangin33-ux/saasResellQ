'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowRight, BellDot, Sparkles, Search as SearchIcon } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { normalizePlan } from '@/lib/plans'

interface Product {
  title?: string
  brand?: string
  price?: number
  demandScore?: number
  profitMargin?: number
  sales?: number
}

interface Category {
  name: string
  topItems?: Array<{
    title: string
    brand: string
    price: number
    demandScore: number
    profitMargin: number
    sales: number
  }>
  trend_direction?: string | null
  trend_strength?: number | string | null
}

function formatTrendStrength(value: number | string | null | undefined) {
  const strength = typeof value === 'string' ? Number(value) : value
  if (strength === null || strength === undefined || !Number.isFinite(strength)) return '—'
  return `${strength.toFixed(1)}%`
}

function parseNumericTrend(value: number | string | null | undefined): number {
  const parsed = typeof value === 'string' ? Number(value) : value
  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) return 0
  return parsed
}

interface UsageState {
  plan: string
  planLabel: string
  active: boolean
  limit: number
  used: number
  remaining: number
}

interface VintedAccount {
  id: string
  username: string
}

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [usage, setUsage] = useState<UsageState | null>(null)
  const [accounts, setAccounts] = useState<VintedAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [extraLoading, setExtraLoading] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [productsRes, categoriesRes, usageRes] = await Promise.all([
          fetch('/api/vinted/top-products'),
          fetch('/api/vinted/top-categories'),
          fetch('/api/ai/usage'),
        ])

        const productsData = productsRes.ok ? await productsRes.json().catch(() => ({})) : {}
        const categoriesData = categoriesRes.ok ? await categoriesRes.json().catch(() => ({})) : {}
        const usageData = usageRes.ok ? await usageRes.json().catch(() => null) : null

        setProducts(productsData.products ?? [])
        setCategories(categoriesData.categories ?? [])
        setUsage(usageData && !('error' in usageData) ? usageData : null)
      } catch {
        setProducts([])
        setCategories([])
        setUsage(null)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  useEffect(() => {
    async function loadExtras() {
      if (!usage) return
      setExtraLoading(true)

      try {
        if (normalizePlan(usage.plan) === 'BUSINESS') {
          const accountsRes = await fetch('/api/vinted/accounts')
          const accountsData = accountsRes.ok ? await accountsRes.json().catch(() => ({})) : {}
          setAccounts(accountsData.accounts ?? [])
        }
      } finally {
        setExtraLoading(false)
      }
    }

    loadExtras()
  }, [usage])

  const planKey = useMemo(() => {
    const normalized = normalizePlan(usage?.plan)
    return normalized === 'FREE' ? 'STARTER' : normalized
  }, [usage])

  const aiCredits = usage ? `${usage.remaining.toLocaleString('fr-FR')} / ${usage.limit.toLocaleString('fr-FR')}` : 'Aucune donnée disponible'
  const activeSignals = categories.filter((item) => parseNumericTrend(item.trend_strength ?? 0) > 6).length
  const latestAnalyses = categories.slice(0, 4)
  const averageMargin = useMemo(() => {
    if (!products.length) return 0
    return Math.round(products.reduce((sum, item) => sum + (item.profitMargin ?? 0), 0) / products.length)
  }, [products])

  const planHighlights = useMemo(() => {
    switch (planKey) {
      case 'BUSINESS':
        return ['Toutes les catégories incluses', 'Exports PDF / Excel', 'Multi-comptes Vinted', 'Dashboard Business']
      case 'PRO':
        return ['Alertes illimitées', 'Historique 90 jours', 'Exports CSV / Excel', 'Rapports avancés']
      default:
        return ['Top produits clés', 'Alertes basiques', 'Watchlist 20 articles', 'Analyse IA essentielle']
    }
  }, [planKey])

  const chartData = useMemo(() => {
    if (categories.length > 0) {
      return categories.slice(0, 6).map((item) => ({ name: item.name, value: Math.max(0, parseNumericTrend(item.trend_strength ?? 0)) }))
    }

    return [
      { name: 'Mode', value: 22 },
      { name: 'Jeans', value: 34 },
      { name: 'Sacs', value: 18 },
      { name: 'Chaussures', value: 28 },
      { name: 'Vêtements', value: 16 },
    ]
  }, [categories])

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_45%),linear-gradient(135deg,_#111116_0%,_#09090b_100%)] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:p-8">
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-violet-300">Tableau de bord {planKey === 'BUSINESS' ? 'Business' : planKey === 'PRO' ? 'Pro' : 'Starter'}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{planKey === 'BUSINESS' ? 'Pilotez votre activité comme une vraie entreprise' : planKey === 'PRO' ? 'Passez à l’analyse pro avec des insights profonds' : 'Commencez simplement avec les essentiels du marché'}</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{planKey === 'BUSINESS'
              ? 'Accédez aux données multi-comptes, aux exports complets et à un espace de travail conçu pour les équipes.'
              : planKey === 'PRO'
                ? 'Analysez plus de catégories, suivez les tendances de marge et lancez des actions à fort impact.'
                : 'Utilisez ResellQ pour repérer les meilleures opportunités et découvrir le potentiel de vos ventes.'}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/vinted-dashboard" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-400/25 bg-white/90 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-violet-50">
              Voir le revenu Vinted
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/opportunities" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.15]">
              Explorer les opportunités
              <Sparkles className="h-4 w-4 text-violet-300" />
            </Link>
            {planKey === 'BUSINESS' ? (
              <Link href="/dashboard/device-lab" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500/15">
                Ouvrir Device Lab
                <SearchIcon className="h-4 w-4 text-violet-300" />
              </Link>
            ) : (
              <Link href="/pricing" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.15]">
                Passer au {planKey === 'PRO' ? 'Business' : 'Pro'}
                <Sparkles className="h-4 w-4 text-violet-300" />
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Catégories actives" value={loading ? '—' : categories.length.toString()} detail={categories.length > 0 ? 'Veilles alimentées' : 'Aucune donnée disponible'} />
        <Metric label="Signaux exploités" value={loading ? '—' : activeSignals.toString()} detail={activeSignals > 0 ? 'Mouvements détectés' : 'Aucun signal pour l’instant'} />
        <Metric
          label={planKey === 'BUSINESS' ? 'Comptes Vinted' : 'Produits prioritaires'}
          value={loading ? '—' : planKey === 'BUSINESS' ? (extraLoading ? '...' : `${Math.max(1, accounts.length)}`) : products.slice(0, 5).length.toString()}
          detail={planKey === 'BUSINESS' ? 'Multi-comptes connectés' : products.length > 0 ? 'Affinage pro' : 'Aucun résultat'}
        />
        <Metric label="Crédits IA" value={loading ? '—' : aiCredits} detail={usage ? (usage.active ? `${usage.planLabel} — actif` : `${usage.planLabel} — inactif`) : 'Plan non renseigné'} accent />
      </section>

      {planKey !== 'STARTER' ? (
        <section className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-white/10 bg-[#111116] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-white">Analyse avancée</p>
                <p className="mt-1 text-sm text-zinc-500">Un aperçu synthétique des tendances et des opportunités les plus profitables.</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">{planKey === 'BUSINESS' ? 'Business' : 'Pro'}</span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <FeatureRow label="Marge estimée" value={`${averageMargin}%`} />
              <FeatureRow label="Alertes" value={planKey === 'PRO' ? 'Illimitées' : 'Temps réel'} />
              <FeatureRow label="Exports" value={planKey === 'PRO' ? 'CSV / Excel' : 'CSV / Excel / PDF'} />
              <FeatureRow label="Support" value={planKey === 'PRO' ? 'Prioritaire' : 'VIP + Discord'} />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#111116] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
            <p className="text-sm font-medium text-white">Ce que votre plan déverrouille</p>
            <p className="mt-2 text-sm text-zinc-400">{planKey === 'PRO'
              ? 'Plus de profondeur, plus de filtres et une exploitation métier plus rapide.'
              : 'Toutes les capacités Pro, plus des outils professionnels, du multi-compte et des exports avancés.'}
            </p>
            <div className="mt-5 space-y-3">
              {planHighlights.map((feature) => (
                <div key={feature} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">{feature}</div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-white/10 bg-[#111116] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
            <p className="text-sm font-medium text-white">Starter — parfait pour commencer</p>
            <p className="mt-2 text-sm text-zinc-400">Toutes les bases sont là : collecte de signaux, veille et top produits.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <FeatureRow label="Catégories incluses" value="5 catégories" />
              <FeatureRow label="Watchlist" value="20 articles" />
              <FeatureRow label="Alertes" value="5 / jour" />
              <FeatureRow label="Exports" value="Non inclus" />
            </div>
            <Link href="/pricing" className="mt-6 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Découvrir le Pro</Link>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#111116] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
            <p className="text-sm font-medium text-white">Fonctionnalités Starter</p>
            <div className="mt-5 space-y-3">
              {planHighlights.map((feature) => (
                <div key={feature} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">{feature}</div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mt-6 grid gap-5 xl:grid-cols-[1.25fr_0.9fr]">
        <div className="rounded-[28px] border border-white/10 bg-[#111116] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Opportunités de marché</p>
              <p className="mt-1 text-sm text-zinc-500">Un aperçu rapide des produits à potentiel.</p>
            </div>
            <Link href="/top-products" className="text-sm font-medium text-violet-300">Voir le classement</Link>
          </div>
          <div className="mt-5 space-y-3">
            {loading ? (
              <> {[...Array(4)].map((_, index) => <SkeletonRow key={index} />)} </>
            ) : products.length > 0 ? (
              products.slice(0, 4).map((product, index) => (
                <div key={`${product.title}-${index}`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{product.title ?? 'Produit en attente'}</p>
                    <p className="mt-1 text-sm text-zinc-500">{product.brand ?? 'Marque non renseignée'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-300">{product.profitMargin ? `${product.profitMargin}%` : '—'}</p>
                    <p className="mt-1 text-xs text-zinc-500">{product.price ? `${product.price}€` : 'Prix non renseigné'}</p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="Aucun résultat disponible" description="Les produits prioritaires apparaîtront ici dès que les données seront disponibles." />
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#111116] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <BellDot className="h-4 w-4 text-violet-300" />
            État de veille
          </div>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="text-sm font-medium text-emerald-200">Veilles actives</p>
              <p className="mt-1 text-2xl font-semibold text-white">{categories.length > 0 ? categories.length : '0'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-white">Alertes</p>
              <p className="mt-1 text-sm text-zinc-500">{planKey === 'STARTER' ? '5 alertes/jour disponibles.' : planKey === 'PRO' ? 'Alertes illimitées et IA' : 'Alertes prioritaires en temps réel.'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-white">Historique</p>
              <p className="mt-1 text-sm text-zinc-500">{planKey === 'STARTER' ? 'Journal limité à 30 jours.' : planKey === 'PRO' ? 'Historique 90 jours et analyses sauvegardées.' : 'Historique complet, exports et reporting.'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-white/10 bg-[#111116] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Dernières analyses</p>
              <p className="mt-1 text-sm text-zinc-500">Un point rapide sur les catégories les plus dynamiques.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400">Dernière mise à jour</span>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <> {[...Array(3)].map((_, index) => <SkeletonRow key={index} />)} </>
            ) : latestAnalyses.length > 0 ? (
              latestAnalyses.map((category, index) => (
                <div key={`${category.name}-${index}`} className="flex items-start justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div>
                    <p className="text-sm font-medium text-white">{category.name}</p>
                    <p className="mt-1 text-sm text-zinc-500">{category.topItems?.[0]?.title ?? 'Tendance en cours'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-emerald-300">{formatTrendStrength(category.trend_strength)}</p>
                    <p className="mt-1 text-xs text-zinc-500">{category.topItems?.length ? `${category.topItems.length} produits` : 'Aucune donnée'}</p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="Aucune analyse disponible" description="Commencez par créer votre première veille pour alimenter le tableau de bord." />
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#111116] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:p-6">
          <p className="text-sm font-medium text-white">Tendances clés</p>
          <div className="mt-5 h-64 rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 6, right: 6, left: -28, bottom: 0 }}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0f1724', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} labelStyle={{ color: '#e2e8f0' }} itemStyle={{ color: '#a78bfa' }} />
                <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3, fill: '#a78bfa' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  )
}

function FeatureRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
      <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">{label}</p>
      <p className="mt-2 font-medium text-white">{value}</p>
    </div>
  )
}

function Metric({ label, value, detail, accent = false }: { label: string; value: string; detail: string; accent?: boolean }) {
  return (
    <div className={`rounded-[24px] border p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] ${accent ? 'border-violet-400/20 bg-violet-500/[0.08]' : 'border-white/10 bg-[#111116]'}`}>
      <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className={`mt-2 text-sm ${accent ? 'text-violet-200' : 'text-zinc-500'}`}>{detail}</p>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] p-6 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400">
        <Activity className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>
    </div>
  )
}
