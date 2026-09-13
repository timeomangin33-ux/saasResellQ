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
  /** Prix demandé médian du relevé le plus récent. Jamais un prix de vente : Vinted ne publie pas ses transactions. */
  median_price?: number | null
  p25_price?: number | null
  p75_price?: number | null
  price_sample?: number | null
  confidence?: string | null
  /** Annonces actuellement en ligne dans la catégorie, et ancienneté du relevé. */
  volume_active?: number | null
  history_days?: number | null
  quality_note?: string | null
}

/**
 * Une opportunité telle que /api/vinted/opportunities la renvoie.
 *
 * `estimatedProfit` est le gain en euros ; `profitMargin` le même écart en
 * pourcentage. Les deux peuvent manquer : une annonce non notée n'a ni l'un
 * ni l'autre, et on affiche alors un tiret.
 */
interface Opportunity {
  title?: string | null
  brand?: string | null
  estimatedProfit?: number | null
  profitMargin?: number | null
  score?: number | null
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

/**
 * Le panneau « Dernières analyses » affichait `formatTrendStrength(c.trend_strength)`,
 * or /api/vinted/top-categories ne renvoie aucun champ `trend_strength` : sa seule
 * colonne chiffrée montrait donc « — » en permanence. On affiche à la place le prix
 * demandé médian et la fourchette p25–p75, qui sont mesurés dès aujourd'hui.
 */
function formatPrix(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `${Math.round(value)} €`
}

/**
 * Le panneau « Opportunités du moment » n'affichait que le pourcentage de
 * marge — « 386,3 % », « 308,2 % ». Un pourcentage seul trompe sur un article
 * bon marché : 386 % sur un chargeur à 3 € font onze euros, là où 30 % sur un
 * manteau à 200 € en font soixante. Le gain en euros passe donc devant.
 */
function formatGain(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `${value >= 0 ? '+' : '−'}${Math.abs(Math.round(value))} €`
}

/** La marge reste affichée, en second : elle dit à quel point l'écart est large. */
function formatMarge(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'marge non mesurée'
  return `marge ${Math.round(value)} %`
}

/** Ce qui soutient le chiffre : combien d'annonces, depuis combien de temps. */
function formatSuivi(c: Category) {
  const bouts: string[] = []
  if (typeof c.volume_active === 'number' && c.volume_active > 0) {
    bouts.push(`${c.volume_active} annonce${c.volume_active > 1 ? 's' : ''} en ligne`)
  }
  if (typeof c.history_days === 'number' && c.history_days > 0) {
    bouts.push(`${c.history_days} j de recul`)
  }
  return bouts.join(' · ')
}

/** Même vocabulaire que la page Catégories : deux mots pour la même notion se perdent. */
const CONFIANCE: Record<string, { texte: string; classe: string }> = {
  confirme: { texte: 'Mesure confirmée', classe: 'text-emerald-300' },
  'en-mesure': { texte: 'Mesure en cours', classe: 'text-amber-300' },
  insuffisant: { texte: 'Trop peu de recul', classe: 'text-zinc-500' },
}

const pageStagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } }
const item: Variants = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } }

export default function DashboardPage() {
  const { data: session } = useSession()
  const [products, setProducts] = useState<Product[]>([])
  const [productsSource, setProductsSource] = useState<'db' | 'fallback' | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [opportunitesApi, setOpportunitesApi] = useState<Opportunity[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  /** Quelles fonctions peuvent réellement répondre — voir l'encart assistant IA plus bas. */
  const [fonctions, setFonctions] = useState<Record<string, boolean> | null>(null)

  const [vintedStatus, setVintedStatus] = useState<VintedStatus>('loading')
  const [vintedData, setVintedData] = useState<VintedDashboardData | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [showConnect, setShowConnect] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [productsRes, categoriesRes, opportunitesRes, notifRes] = await Promise.all([
          fetch('/api/vinted/top-products'),
          fetch('/api/vinted/top-categories'),
          // Seule route qui renvoie le gain en euros (`estimatedProfit`). Elle
          // est réservée aux forfaits et répond 403 à un compte Découverte :
          // le repli sur top-products est géré dans le mémo `opportunites`.
          fetch('/api/vinted/opportunities?limit=20'),
          fetch('/api/notifications'),
        ])
        const productsData = productsRes.ok ? await productsRes.json().catch(() => ({})) : {}
        const categoriesData = categoriesRes.ok ? await categoriesRes.json().catch(() => ({})) : {}
        const opportunitesData = opportunitesRes.ok ? await opportunitesRes.json().catch(() => ({})) : {}
        const notifData = notifRes.ok ? await notifRes.json().catch(() => ({})) : {}

        setProducts(productsData.products ?? [])
        setProductsSource(productsData.source ?? null)
        setCategories(categoriesData.categories ?? [])
        setOpportunitesApi(opportunitesData.opportunities ?? [])
        setNotifications(notifData.notifications ?? [])
      } catch {
        setProducts([])
        setCategories([])
        setOpportunitesApi([])
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

  /**
   * L'encart « Ouvrir le chat IA » envoyait vers /ai-agent alors que les agents
   * passent par n8n et que N8N_WEBHOOK_BASE_URL n'est pas configuré : chaque
   * question recevait « momentanément indisponible ». Le menu applique déjà ce
   * test (app/dashboard-layout.tsx, `fonctions.assistantIA`) pour masquer
   * Assistant IA et Rapports ; l'encart le manquait.
   */
  useEffect(() => {
    let actif = true
    fetch('/api/integrations')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (actif) setFonctions(d?.fonctions ?? null) })
      .catch(() => undefined)
    return () => { actif = false }
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
  /**
   * Un compte Vinted est lié dès que /api/vinted/dashboard répond autre chose
   * qu'un 404 : `ready` (des ventes importées) ou `empty` (compte lié, rien
   * encore synchronisé). `loading` et `not_connected` valent « pas de compte ».
   */
  const compteVintedLie = vintedStatus === 'ready' || vintedStatus === 'empty'

  /**
   * Le gain en euros vient de /api/vinted/opportunities. Quand cette route
   * refuse (forfait requis), on retombe sur /api/vinted/top-products, ouvert à
   * tout compte connecté, et on refait le calcul de la route : prix collecté ×
   * marge mesurée. Deux valeurs relevées, rien d'inventé ; si l'une des deux
   * manque, aucun gain n'est calculé et la case affiche un tiret. Le classement
   * se fait alors sur les euros et non sur le pourcentage, qui ferait remonter
   * les articles à deux euros.
   */
  const opportunites = useMemo<Opportunity[]>(() => {
    // Une même marque au même prix reçoit la même note et le même gain : sans
    // garde, le panneau affichait trois lignes Apple à « +57 € · 177 % » pour
    // une coque, une souris et un iPhone 7. Trois fois le même chiffre
    // n'apprend rien ; on garde au plus une annonce par marque ici, où il n'y a
    // que trois places.
    const unePlaceParMarque = (liste: Opportunity[]) => {
      const vues = new Set<string>()
      return liste.filter((o) => {
        const marque = (o.brand ?? 'sans marque').toLowerCase()
        if (vues.has(marque)) return false
        vues.add(marque)
        return true
      })
    }

    if (opportunitesApi.length > 0) return unePlaceParMarque(opportunitesApi).slice(0, 3)
    return unePlaceParMarque(products
      .map((p) => ({
        title: p.title,
        brand: p.brand,
        profitMargin: p.profitMargin ?? null,
        estimatedProfit:
          typeof p.price === 'number' && Number.isFinite(p.price) &&
          typeof p.profitMargin === 'number' && Number.isFinite(p.profitMargin)
            ? Math.round(p.price * p.profitMargin) / 100
            : null,
      }))
      .sort((a, b) => {
        // Sans gain calculé, l'annonce passe en dernier plutôt que devant.
        if (a.estimatedProfit === null && b.estimatedProfit === null) return 0
        if (a.estimatedProfit === null) return 1
        if (b.estimatedProfit === null) return -1
        return b.estimatedProfit - a.estimatedProfit
      })).slice(0, 3)
  }, [opportunitesApi, products])

  // Le marché tient la tête de page quand il n'y a pas de compte lié : on en
  // montre cinq lignes au lieu de trois, l'espace est disponible.
  const analysesMarche = useMemo(
    () => categories.slice(0, compteVintedLie ? 3 : 5),
    [categories, compteVintedLie],
  )
  const assistantIADisponible = fonctions?.assistantIA === true

  /**
   * Proposer de connecter un compte Vinted n'a de sens que là où ça peut
   * aboutir. Lire les annonces d'un membre demande sa session, obtenue en
   * pilotant un navigateur — et il n'y a pas de Chromium sur une fonction
   * serverless. L'invitation s'affichait pourtant à tout abonné, qui la
   * suivait jusqu'à une erreur parlant de Chromium.
   *
   * Comme pour l'assistant : rien tant que la réponse n'est pas là, plutôt
   * qu'une invitation affichée puis retirée sous les yeux.
   */
  const inviteCompteVinted = vintedStatus === 'not_connected' && fonctions?.comptesVinted === true

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
            <p className="mt-1.5 text-sm text-zinc-500">
              {compteVintedLie
                ? 'Voici un aperçu de ton activité sur ResellQ.'
                : 'Voici ce que ResellQ mesure aujourd\'hui sur le marché Vinted.'}
            </p>
          </div>
          <motion.div
            className="chip flex-shrink-0 border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> 30 derniers jours
          </motion.div>
        </motion.div>

        {/*
          Tête de page : les quatre tuiles « vos ventes » et le graphe de revenus
          ne sont rendus que si un compte Vinted est lié. Sans ça, un nouvel
          inscrit ouvrait le tableau de bord sur quatre tuiles vides (« — », « —
          », « — », « — ») et un demi-écran de graphe barré d'un « Connectez
          votre compte », pendant que les données de marché — les seules qui
          répondent sans rien connecter — étaient repoussées sous la ligne de
          flottaison.
        */}
        {compteVintedLie && (
          <>
            <motion.div variants={item} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                icon={Wallet}
                accent="emerald"
                label="Vos revenus Vinted"
                value={vintedData ? Math.round(vintedData.revenue30) : null}
                suffix="€"
                delta={vintedData?.deltas.revenue ?? null}
                compare="vs 30 jours précédents"
              />
              <KpiCard
                icon={Tag}
                accent="emerald"
                label="Vos ventes (30 j)"
                value={vintedData ? vintedData.totalSales : null}
                delta={vintedData?.deltas.sales ?? null}
                compare="vs 30 jours précédents"
              />
              <KpiCard
                icon={Package}
                accent="cyan"
                label="Vos annonces actives"
                value={vintedData ? vintedData.activeListings : null}
                compare="synchronisées depuis Vinted"
              />
              <KpiCard
                icon={TrendingUp}
                accent="violet"
                label="Prix moyen de vos ventes"
                value={vintedData ? Math.round(vintedData.avgPrice) : null}
                suffix="€"
                delta={vintedData?.deltas.avgPrice ?? null}
                compare="vs 30 jours précédents"
              />
            </motion.div>

            <motion.div variants={item} className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
              <SpotlightCard spotlightColor="rgba(16,185,129,0.14)">
                <GlassPanel accent="emerald" className="p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">Vos revenus Vinted</p>
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
                        <p className="text-sm text-zinc-500">En attente de vos premières ventes.</p>
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
                  {vintedStatus === 'empty' ? (
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
                      <p className="mt-1 text-xs text-zinc-500">total de vos ventes encaissées</p>
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
          </>
        )}

        {/*
          Le marché : mesuré pour tout le monde, sans rien connecter. C'est ce
          qui ouvre la page tant qu'aucun compte Vinted n'est lié.
        */}
        <motion.div variants={item} className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
          <SpotlightCard spotlightColor="rgba(16,185,129,0.14)">
            <GlassPanel accent="emerald" className="h-full p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-white"><Radar className="h-4 w-4 text-emerald-300" /> Prix demandés par catégorie</p>
                  <p className="mt-0.5 text-xs text-zinc-500">Relevés sur les annonces en ligne. Vinted ne publie pas ses transactions.</p>
                </div>
                <span className="chip flex-shrink-0 text-zinc-400">Marché</span>
              </div>
              <div className="mt-4 space-y-3.5">
                {loading ? (
                  [...Array(4)].map((_, i) => <SkeletonLine key={i} />)
                ) : analysesMarche.length > 0 ? (
                  analysesMarche.map((c, i) => {
                    const confiance = CONFIANCE[c.confidence ?? 'insuffisant'] ?? CONFIANCE.insuffisant
                    const fourchette =
                      c.p25_price !== null && c.p25_price !== undefined && c.p75_price !== null && c.p75_price !== undefined
                        ? `moitié des annonces entre ${Math.round(c.p25_price)} et ${Math.round(c.p75_price)} €`
                        : c.price_sample
                          ? `relevé sur ${c.price_sample} annonces récentes`
                          : 'relevé en cours'
                    const suivi = formatSuivi(c)
                    return (
                      <div key={`${c.name}-${i}`} className="flex items-start justify-between gap-2" title={c.quality_note ?? undefined}>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{c.name}</p>
                          <p className="truncate text-xs text-zinc-500">{fourchette}</p>
                          {suivi && <p className="truncate text-[11px] text-zinc-600">{suivi}</p>}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-sm font-semibold text-emerald-300 tabular-nums">{formatPrix(c.median_price)}</p>
                          <p className="text-[11px] text-zinc-500">prix demandé médian</p>
                          <p className={`text-[11px] ${confiance.classe}`}>{confiance.texte}</p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="py-4 text-center text-sm text-zinc-500">Aucun relevé disponible pour l'instant.</p>
                )}
              </div>
              <Link href="/categories" className="mt-4 block text-center text-xs font-medium text-emerald-300 hover:text-emerald-200">Voir toutes les catégories</Link>
            </GlassPanel>
          </SpotlightCard>

          <SpotlightCard spotlightColor="rgba(139,92,246,0.14)">
            <GlassPanel accent="violet" className="h-full p-5 sm:p-6">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-white"><Sparkles className="h-4 w-4 text-violet-300" /> Opportunités du moment</p>
                  <p className="mt-0.5 text-xs text-zinc-500">Gain estimé face au prix demandé médian de la marque.</p>
                </div>
                {productsSource === 'fallback' && <DemoBadge />}
              </div>
              <div className="mt-4 space-y-3.5">
                {loading ? (
                  [...Array(3)].map((_, i) => <SkeletonLine key={i} />)
                ) : opportunites.length > 0 ? (
                  opportunites.map((o, i) => (
                    <div key={`${o.title ?? 'annonce'}-${i}`} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{o.title ?? 'Annonce'}</p>
                        <p className="truncate text-xs text-zinc-500">{o.brand ?? 'Marque non renseignée'}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-semibold text-violet-200 tabular-nums">{formatGain(o.estimatedProfit)}</p>
                        <p className="text-[11px] text-zinc-500 tabular-nums">{formatMarge(o.profitMargin)}</p>
                      </div>
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

        {/*
          Le compte Vinted reste proposé — c'est honnête et utile — mais en
          second rideau, sur une carte compacte, plutôt qu'en tête d'affiche à
          côté de quatre tuiles vides.
        */}
        <motion.div variants={item} className={cn('grid gap-4', inviteCompteVinted && 'lg:grid-cols-2')}>
          {inviteCompteVinted && (
            <SpotlightCard spotlightColor="rgba(16,185,129,0.16)">
              <GlassPanel accent="emerald" className="flex h-full flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500/25 to-teal-400/10 text-emerald-200">
                    <Link2 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">Compte Vinted</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {sansForfait
                        ? 'Suivre tes propres ventes demande un forfait. Le marché ci-dessus reste ouvert sans rien connecter.'
                        : 'Connecte ton compte pour suivre tes annonces, tes ventes et tes revenus ici.'}
                    </p>
                  </div>
                </div>
                <Magnetic strength={0.2} className="flex-shrink-0">
                  {sansForfait ? (
                    <Link
                      href="/pricing"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-200 sm:w-auto"
                    >
                      <Sparkles className="h-4 w-4" /> Voir les forfaits
                    </Link>
                  ) : (
                    <motion.button
                      onClick={() => setShowConnect(true)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-200 sm:w-auto"
                    >
                      <Lock className="h-4 w-4" /> Connecter le compte Vinted
                    </motion.button>
                  )}
                </Magnetic>
              </GlassPanel>
            </SpotlightCard>
          )}

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
        </motion.div>

        <AnimatePresence>
          {showConnect && <VintedConnectModal onClose={() => setShowConnect(false)} redirectTo="/dashboard" />}
        </AnimatePresence>

        {/*
          Encart assistant IA : rendu seulement quand /api/integrations confirme
          que la fonction répond. Tant que la réponse n'est pas là (`fonctions`
          à null), rien n'est rendu — contrairement au menu, une carte qui
          arrive avec une demi-seconde de retard gêne moins qu'un bouton qui
          promet une réponse et renvoie « momentanément indisponible ».
        */}
        {assistantIADisponible && (
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
        )}
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
