'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Wallet,
  Tag,
  Package,
  TrendingUp,
  RefreshCw,
  Loader2,
  Link2,
  Lock,
  BellDot,
  Radar,
  type LucideIcon,
} from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { cn } from '@/lib/utils'
import { NumberTicker } from '@/components/ui/number-ticker'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { Magnetic } from '@/components/ui/magnetic'
import VintedConnectModal from '@/app/components/VintedConnectModal'

interface Product {
  title?: string
  brand?: string
  price?: number
  profitMargin?: number
}

interface Category {
  name: string
  topItems?: Array<{ title: string }>
  trend_direction?: string | null
  trend_strength?: number | string | null
}

interface NotificationItem {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
}

interface VintedDashboardData {
  totalRevenue: number
  totalSales: number
  activeListings: number
  soldListings: number
  avgPrice: number
  revenueToday: number
  revenue7: number
  revenue30: number
  deltas: { revenue: number | null; sales: number | null; avgPrice: number | null }
  series: Array<{ date: string; label: string; revenue: number }>
  username?: string | null
}

type VintedStatus = 'loading' | 'not_connected' | 'empty' | 'ready'

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'à l\'instant'
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  return `il y a ${d} j`
}

function formatTrendStrength(value: number | string | null | undefined) {
  const strength = typeof value === 'string' ? Number(value) : value
  if (strength === null || strength === undefined || !Number.isFinite(strength)) return '—'
  return `${strength.toFixed(1)}%`
}

const pageStagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } }
const item: Variants = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } }

export default function DashboardPage() {
  const { data: session } = useSession()
  const [products, setProducts] = useState<Product[]>([])
  const [productsSource, setProductsSource] = useState<'db' | 'fallback' | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const [vintedStatus, setVintedStatus] = useState<VintedStatus>('loading')
  const [vintedData, setVintedData] = useState<VintedDashboardData | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [showConnect, setShowConnect] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [productsRes, categoriesRes, notifRes] = await Promise.all([
          fetch('/api/vinted/top-products'),
          fetch('/api/vinted/top-categories'),
          fetch('/api/notifications'),
        ])
        const productsData = productsRes.ok ? await productsRes.json().catch(() => ({})) : {}
        const categoriesData = categoriesRes.ok ? await categoriesRes.json().catch(() => ({})) : {}
        const notifData = notifRes.ok ? await notifRes.json().catch(() => ({})) : {}

        setProducts(productsData.products ?? [])
        setProductsSource(productsData.source ?? null)
        setCategories(categoriesData.categories ?? [])
        setNotifications(notifData.notifications ?? [])
      } catch {
        setProducts([])
        setCategories([])
        setNotifications([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    let active = true
    async function loadVinted() {
      try {
        const res = await fetch('/api/vinted/dashboard')
        if (res.status === 404) {
          if (active) { setVintedStatus('not_connected'); setVintedData(null) }
          return
        }
        const data = await res.json().catch(() => null)
        if (!active) return
        if (!res.ok || !data) { setVintedStatus('not_connected'); setVintedData(null); return }
        setVintedStatus(data.totalSales > 0 ? 'ready' : 'empty')
        setVintedData(data)
      } catch {
        if (active) { setVintedStatus('not_connected'); setVintedData(null) }
      }
    }
    loadVinted()
    return () => { active = false }
  }, [])

  async function syncVinted() {
    setSyncing(true)
    try {
      const res = await fetch('/api/vinted/sync', { method: 'POST' })
      if (res.ok) {
        const data = await fetch('/api/vinted/dashboard').then((r) => (r.ok ? r.json() : null)).catch(() => null)
        if (data) {
          setVintedStatus(data.totalSales > 0 ? 'ready' : 'empty')
          setVintedData(data)
        }
      }
    } finally {
      setSyncing(false)
    }
  }

  const firstName = session?.user?.name?.split(' ')[0] || 'là'
  // Connecter un compte Vinted demande un forfait : sans ça, proposer la
  // connexion à un nouvel inscrit l'envoie contre un mur.
  const sansForfait =
    session?.user?.role !== 'ADMIN' && session?.user?.subscriptionStatus !== 'ACTIVE'
  const opportunities = useMemo(() => products.slice(0, 3), [products])
  const latestAnalyses = useMemo(() => categories.slice(0, 3), [categories])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <motion.div variants={pageStagger} initial="hidden" animate="show" className="space-y-5">
        {/* ---------- Greeting header ---------- */}
        <motion.div variants={item} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Bienvenue, {firstName}{' '}
              <motion.span
                className="inline-block"
                animate={{ rotate: [0, 18, -10, 18, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
              >
                👋
              </motion.span>
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500">Voici un aperçu de ton activité sur ResellQ.</p>
          </div>
          <motion.div
            className="chip flex-shrink-0 border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> 30 derniers jours
          </motion.div>
        </motion.div>

        {/* ---------- KPI row ---------- */}
        <motion.div variants={item} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={Wallet}
            accent="emerald"
            label="Revenus Vinted"
            value={vintedStatus === 'ready' || vintedStatus === 'empty' ? Math.round(vintedData?.revenue30 ?? 0) : null}
            suffix="€"
            delta={vintedData?.deltas.revenue ?? null}
            compare="vs 30 jours précédents"
          />
          <KpiCard
            icon={Tag}
            accent="emerald"
            label="Ventes (30j)"
            value={vintedStatus === 'ready' || vintedStatus === 'empty' ? vintedData?.totalSales ?? 0 : null}
            delta={vintedData?.deltas.sales ?? null}
            compare="vs 30 jours précédents"
          />
          <KpiCard
            icon={Package}
            accent="cyan"
            label="Annonces actives"
            value={vintedStatus === 'ready' || vintedStatus === 'empty' ? vintedData?.activeListings ?? 0 : null}
            compare="synchronisées depuis Vinted"
          />
          <KpiCard
            icon={TrendingUp}
            accent="violet"
            label="Prix moyen"
            value={vintedStatus === 'ready' || vintedStatus === 'empty' ? Math.round(vintedData?.avgPrice ?? 0) : null}
            suffix="€"
            delta={vintedData?.deltas.avgPrice ?? null}
            compare="vs 30 jours précédents"
          />
        </motion.div>

        {/* ---------- Chart + Vinted account ---------- */}
        <motion.div variants={item} className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
          <SpotlightCard spotlightColor="rgba(16,185,129,0.14)">
            <GlassPanel accent="emerald" className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">Revenus Vinted</p>
                <span className="chip text-zinc-400">30 derniers jours</span>
              </div>
              <div className="mt-5 h-64 rounded-2xl border border-white/[0.06] bg-black/20 p-3 sm:p-4">
                {vintedStatus === 'ready' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={vintedData?.series ?? []} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueFillE" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34d399" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                      <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v: number) => `${v}€`} />
                      <Tooltip
                        contentStyle={{ background: '#0f1712', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, fontSize: 12 }}
                        labelStyle={{ color: '#e4e4e7' }}
                        formatter={(value: number) => [`${value}€`, 'Revenu']}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#34d399" strokeWidth={2.5} fill="url(#revenueFillE)" dot={false} isAnimationActive animationDuration={1200} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <motion.div animate={{ opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 2, repeat: Infinity }}>
                      <Activity className="h-6 w-6 text-zinc-600" />
                    </motion.div>
                    <p className="text-sm text-zinc-500">{vintedStatus === 'not_connected' ? 'Connectez votre compte pour voir vos revenus.' : 'En attente de vos premières ventes.'}</p>
                  </div>
                )}
              </div>
              {vintedStatus === 'ready' && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <div>
                    <p className="text-zinc-500">Total 30 jours</p>
                    <p className="mt-0.5 font-semibold text-white">{Math.round(vintedData?.revenue30 ?? 0)} €</p>
                  </div>
                  <div className="text-right">
                    <p className="text-zinc-500">Moyenne / jour</p>
                    <p className="mt-0.5 font-semibold text-white">{((vintedData?.revenue30 ?? 0) / 30).toFixed(2)} €</p>
                  </div>
                </div>
              )}
            </GlassPanel>
          </SpotlightCard>

          <SpotlightCard spotlightColor="rgba(16,185,129,0.16)">
            <GlassPanel accent="emerald" className="flex h-full flex-col items-center justify-center p-6 text-center sm:p-8">
              {vintedStatus === 'not_connected' && sansForfait ? (
                <>
                  <p className="text-sm font-semibold text-white">Compte Vinted</p>
                  <p className="mx-auto mt-2 max-w-[280px] text-sm text-zinc-400">
                    Ton compte Découverte donne accès au marché : catégories, prix moyens et
                    médians, tendances. Connecter ton propre compte Vinted pour suivre tes ventes
                    demande un forfait.
                  </p>
                  <motion.div
                    className="mt-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500/25 to-teal-400/10 text-emerald-200"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Link2 className="h-7 w-7" />
                  </motion.div>
                  <Magnetic strength={0.2} className="mt-6 w-full">
                    <Link
                      href="/pricing"
                      className="btn-shine inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_-14px_rgba(16,185,129,0.6)]"
                    >
                      <Sparkles className="h-4 w-4" /> Voir les forfaits
                    </Link>
                  </Magnetic>
                  <p className="mt-4 text-xs text-zinc-500">Sans carte bancaire tant que tu ne choisis pas.</p>
                </>
              ) : vintedStatus === 'not_connected' ? (
                <>
                  <p className="text-sm font-semibold text-white">Compte Vinted</p>
                  <p className="mx-auto mt-2 max-w-[260px] text-sm text-zinc-400">Connecte ton compte Vinted pour synchroniser tes annonces, ventes et statistiques.</p>
                  <motion.div
                    className="mt-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-400/10 text-emerald-200"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Link2 className="h-7 w-7" />
                  </motion.div>
                  <Magnetic strength={0.2} className="mt-6 w-full">
                    <motion.button
                      onClick={() => setShowConnect(true)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="btn-shine inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_-14px_rgba(16,185,129,0.6)]"
                    >
                      <Sparkles className="h-4 w-4" /> Connecter le compte Vinted
                    </motion.button>
                  </Magnetic>
                  <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
                    <Lock className="h-3 w-3" /> Connexion sécurisée. Tes identifiants restent privés.
                  </p>
                </>
              ) : vintedStatus === 'empty' ? (
                <>
                  <div className="chip border-emerald-400/25 bg-emerald-500/10 text-emerald-300">
                    <Activity className="h-3.5 w-3.5 animate-pulse" /> Connecté{vintedData?.username ? ` — @${vintedData.username}` : ''}
                  </div>
                  <p className="mx-auto mt-4 max-w-[260px] text-sm text-zinc-400">En attente de vos premières ventes. Lancez une synchronisation pour importer vos données.</p>
                  <Magnetic strength={0.2} className="mt-6 w-full">
                    <motion.button
                      onClick={syncVinted}
                      disabled={syncing}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-60"
                    >
                      {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      {syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
                    </motion.button>
                  </Magnetic>
                </>
              ) : (
                <>
                  <div className="chip border-emerald-400/25 bg-emerald-500/10 text-emerald-300">
                    <Activity className="h-3.5 w-3.5 animate-pulse" /> Connecté{vintedData?.username ? ` — @${vintedData.username}` : ''}
                  </div>
                  <p className="mt-4 text-3xl font-semibold text-white">
                    <NumberTicker value={Math.round(vintedData?.totalRevenue ?? 0)} suffix="€" />
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">chiffre d'affaires total</p>
                  <div className="mt-6 grid w-full grid-cols-2 gap-2.5">
                    <Magnetic strength={0.2}>
                      <motion.button
                        onClick={syncVinted}
                        disabled={syncing}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Sync
                      </motion.button>
                    </Magnetic>
                    <Magnetic strength={0.2}>
                      <Link href="/vinted-dashboard" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2.5 text-xs font-semibold text-zinc-950">
                        Détail <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Magnetic>
                  </div>
                </>
              )}
            </GlassPanel>
          </SpotlightCard>
        </motion.div>

        <AnimatePresence>
          {showConnect && <VintedConnectModal onClose={() => setShowConnect(false)} redirectTo="/dashboard" />}
        </AnimatePresence>

        {/* ---------- 3-panel bottom row ---------- */}
        <motion.div variants={item} className="grid gap-4 lg:grid-cols-3">
          <SpotlightCard spotlightColor="rgba(34,211,238,0.14)">
            <GlassPanel accent="cyan" className="h-full p-5">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold text-white"><BellDot className="h-4 w-4 text-cyan-300" /> Alertes récentes</p>
              </div>
              <div className="mt-4 space-y-3">
                {loading ? (
                  [...Array(3)].map((_, i) => <SkeletonLine key={i} />)
                ) : notifications.length > 0 ? (
                  notifications.slice(0, 3).map((n) => (
                    <div key={n.id} className="flex items-start gap-2.5">
                      <span className={cn('mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full', n.read ? 'bg-zinc-600' : 'bg-emerald-400')} />
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-white">{n.title}</p>
                          <span className="flex-shrink-0 text-[11px] text-zinc-500">{timeAgo(n.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-zinc-500">{n.message}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-sm text-zinc-500">Aucune alerte pour l'instant.</p>
                )}
              </div>
              <Link href="/notifications" className="mt-4 block text-center text-xs font-medium text-cyan-300 hover:text-cyan-200">Voir toutes les alertes</Link>
            </GlassPanel>
          </SpotlightCard>

          <SpotlightCard spotlightColor="rgba(16,185,129,0.14)">
            <GlassPanel accent="emerald" className="h-full p-5">
              <div className="flex items-center gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-white"><Radar className="h-4 w-4 text-emerald-300" /> Dernières analyses</p>
              </div>
              <div className="mt-4 space-y-3">
                {loading ? (
                  [...Array(3)].map((_, i) => <SkeletonLine key={i} />)
                ) : latestAnalyses.length > 0 ? (
                  latestAnalyses.map((c, i) => (
                    <div key={`${c.name}-${i}`} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{c.name}</p>
                        <p className="truncate text-xs text-zinc-500">{c.topItems?.[0]?.title ?? 'Tendance en cours'}</p>
                      </div>
                      <span className="flex-shrink-0 text-sm font-medium text-emerald-300">{formatTrendStrength(c.trend_strength)}</span>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-sm text-zinc-500">Aucune analyse disponible.</p>
                )}
              </div>
              <Link href="/categories" className="mt-4 block text-center text-xs font-medium text-emerald-300 hover:text-emerald-200">Voir toutes les catégories</Link>
            </GlassPanel>
          </SpotlightCard>

          <SpotlightCard spotlightColor="rgba(139,92,246,0.14)">
            <GlassPanel accent="violet" className="h-full p-5">
              <div className="flex items-center gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-white"><Sparkles className="h-4 w-4 text-violet-300" /> Opportunités du moment</p>
                {productsSource === 'fallback' && <DemoBadge />}
              </div>
              <div className="mt-4 space-y-3">
                {loading ? (
                  [...Array(3)].map((_, i) => <SkeletonLine key={i} />)
                ) : opportunities.length > 0 ? (
                  opportunities.map((p, i) => (
                    <div key={`${p.title}-${i}`} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{p.title ?? 'Produit'}</p>
                        <p className="truncate text-xs text-zinc-500">{p.brand ?? 'Marque non renseignée'}</p>
                      </div>
                      <span className="flex-shrink-0 text-sm font-medium text-violet-300">{p.profitMargin ? `${p.profitMargin}%` : '—'}</span>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-sm text-zinc-500">Aucune opportunité disponible.</p>
                )}
              </div>
              <Link href="/opportunities" className="mt-4 block text-center text-xs font-medium text-violet-300 hover:text-violet-200">Voir tout</Link>
            </GlassPanel>
          </SpotlightCard>
        </motion.div>

        {/* ---------- AI assistant banner ---------- */}
        <motion.div variants={item}>
          <SpotlightCard spotlightColor="rgba(16,185,129,0.18)">
            <GlassPanel accent="emerald" className="flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:justify-between sm:p-6 sm:text-left">
              <div className="flex items-center gap-3">
                <motion.span
                  className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-400/10 text-emerald-200"
                  animate={{ rotate: [0, 8, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles className="h-5 w-5" />
                </motion.span>
                <div>
                  <p className="text-sm font-semibold text-white">Besoin d'un coup de pouce ?</p>
                  <p className="text-sm text-zinc-500">Demande à l'assistant IA d'analyser une catégorie, un produit ou une tendance.</p>
                </div>
              </div>
              <Magnetic strength={0.2}>
                <Link href="/ai-agent">
                  <motion.span
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="btn-shine inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_-14px_rgba(16,185,129,0.6)]"
                  >
                    Ouvrir le chat IA <ArrowRight className="h-3.5 w-3.5" />
                  </motion.span>
                </Link>
              </Magnetic>
            </GlassPanel>
          </SpotlightCard>
        </motion.div>
      </motion.div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Design primitives
// ---------------------------------------------------------------------------

type Accent = 'emerald' | 'cyan' | 'violet'

const ACCENT_BG: Record<Accent, string> = {
  emerald: 'bg-emerald-400/15 text-emerald-300',
  cyan: 'bg-cyan-400/15 text-cyan-300',
  violet: 'bg-violet-400/15 text-violet-300',
}

const ACCENT_GLOW: Record<Accent, string> = {
  emerald: 'hover:shadow-[0_24px_70px_-24px_rgba(16,185,129,0.3)] hover:border-emerald-400/20',
  cyan: 'hover:shadow-[0_24px_70px_-24px_rgba(34,211,238,0.28)] hover:border-cyan-400/20',
  violet: 'hover:shadow-[0_24px_70px_-24px_rgba(139,92,246,0.32)] hover:border-violet-400/20',
}

function GlassPanel({ children, className, accent = 'emerald' }: { children: React.ReactNode; className?: string; accent?: Accent }) {
  return (
    <div className={cn('rounded-[24px] border border-white/[0.08] bg-white/[0.025] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-0.5 hover:bg-white/[0.04]', ACCENT_GLOW[accent], className)}>
      {children}
    </div>
  )
}

function DemoBadge() {
  return (
    <span className="chip border-amber-400/20 bg-amber-500/10 text-amber-300" title="Données de démonstration en attendant vos données réelles.">
      <Sparkles className="h-3 w-3" /> Démo
    </span>
  )
}

function KpiCard({
  icon: Icon,
  accent,
  label,
  value,
  suffix = '',
  delta,
  compare,
}: {
  icon: LucideIcon
  accent: Accent
  label: string
  value?: number | null
  suffix?: string
  delta?: number | null
  compare: string
}) {
  return (
    <SpotlightCard spotlightColor={accent === 'emerald' ? 'rgba(16,185,129,0.16)' : accent === 'cyan' ? 'rgba(34,211,238,0.16)' : 'rgba(139,92,246,0.16)'}>
      <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.3 }}>
        <GlassPanel accent={accent} className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-zinc-400">{label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                {value === null || value === undefined ? <span className="text-zinc-600">—</span> : <NumberTicker value={value} suffix={suffix} />}
              </p>
            </div>
            <motion.span
              className={cn('grid h-10 w-10 flex-shrink-0 place-items-center rounded-2xl', ACCENT_BG[accent])}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Icon className="h-4 w-4" />
            </motion.span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            {delta !== null && delta !== undefined ? (
              <span className={cn('inline-flex items-center gap-0.5 font-semibold', delta >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {delta >= 0 ? '+' : ''}{delta}%
              </span>
            ) : null}
            <span className="text-zinc-600">{compare}</span>
          </div>
        </GlassPanel>
      </motion.div>
    </SpotlightCard>
  )
}

function SkeletonLine() {
  return (
    <div className="h-10 overflow-hidden rounded-xl bg-white/[0.03]">
      <motion.div
        className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{ x: ['-100%', '400%'] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}
