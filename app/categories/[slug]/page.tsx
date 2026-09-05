'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { VINTED_CATEGORIES } from '@/vinted'
import { StaggerGroup, staggerItem } from '@/components/ui/reveal'
import { CategoryHistory } from '@/components/category-history'

/**
 * Every figure on this page comes from the scraper's own rows. It previously
 * rendered VINTED_CATEGORIES' hardcoded demandScore / growthRate / totalSales /
 * averagePrice, which are invented values from the "Top ventes simulées"
 * dataset in vinted.ts. VINTED_CATEGORIES is still used, but only as the
 * slug-to-display-name map.
 */
interface Product {
  title: string
  brand: string | null
  price: number
  size: string | null
  condition: string | null
  url: string | null
  imageUrl: string | null
  profitMargin: number | null
  analysisScore: number | null
}

interface CategoryStats {
  avg_price: number | null
  median_price: number | null
  p25_price: number | null
  p75_price: number | null
  price_sample: number | null
  volume_active: number
  trend_direction: string | null
  price_change_percent: number | null
  history_days: number
  confidence: string
  quality_note: string | null
  last_analyzed_at: string | null
}

/**
 * Le repère de fiabilité, dans les mêmes mots que la page Catégories.
 *
 * Deux vocabulaires pour la même notion obligent le lecteur à retenir une
 * correspondance, et il finit par ignorer les deux.
 */
const CONFIANCE: Record<string, { texte: string; classe: string }> = {
  confirme: { texte: 'Mesure confirmée', classe: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/20' },
  'en-mesure': { texte: 'Mesure en cours', classe: 'text-amber-300 bg-amber-500/10 border-amber-400/20' },
  insuffisant: { texte: 'Trop peu de recul', classe: 'text-slate-400 bg-white/[0.03] border-white/10' },
}

function formatOrDash(value: number | null | undefined, suffix = '', digits = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `${value.toFixed(digits)}${suffix}`
}

/** The scraper stores Vinted's condition as an English enum; show it in French. */
const CONDITION_LABELS: Record<string, string> = {
  new: 'Neuf',
  like_new: 'Comme neuf',
  good: 'Bon état',
  fair: 'État correct',
  poor: 'État moyen',
}

function conditionLabel(condition: string | null) {
  if (!condition) return null
  return CONDITION_LABELS[condition] ?? condition
}

/**
 * Le badge de tendance.
 *
 * Il n'avait pas de cas pour `inconnue` : une catégorie sans historique
 * retombait sur le trait gris neutre, qui se lit « stable » — c'est-à-dire une
 * affirmation sur un marché dont on n'a rien mesuré. Même traitement que la
 * page Catégories : on dit que la tendance n'existe pas encore.
 */
function TrendBadge({ direction, percent }: { direction: string | null; percent: number | null }) {
  const inconnue = direction === 'inconnue' || direction === null || percent === null || !Number.isFinite(percent)
  const tone = inconnue
    ? 'text-slate-400 bg-white/[0.03] border-white/10'
    : direction === 'up'
      ? 'text-emerald-300 bg-emerald-500/10 border-emerald-400/20'
      : direction === 'down'
        ? 'text-rose-300 bg-rose-500/10 border-rose-400/20'
        : 'text-slate-300 bg-slate-500/10 border-slate-400/20'
  const Icon = !inconnue && direction === 'up' ? TrendingUp : !inconnue && direction === 'down' ? TrendingDown : Minus
  const label = inconnue ? 'Tendance à venir' : `${percent! > 0 ? '+' : ''}${percent!.toFixed(1)}%`

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${tone}`}>
      <Icon className="h-4 w-4" />
      {label}
    </span>
  )
}

export default function CategoryPage() {
  const params = useParams()
  const slug = params.slug as string
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<CategoryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const category = VINTED_CATEGORIES.find((c) => c.slug === slug)
  const confiance = CONFIANCE[stats?.confidence ?? 'insuffisant'] ?? CONFIANCE.insuffisant
  const joursHistorique = stats?.history_days ?? 0

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setError('')

      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch(`/api/vinted/category-products?category=${encodeURIComponent(slug)}`),
          fetch('/api/vinted/top-categories'),
        ])

        if (!productsRes.ok) throw new Error('Impossible de charger les produits')
        const { products } = await productsRes.json()

        let matched: CategoryStats | null = null
        if (categoriesRes.ok && category) {
          const { categories } = await categoriesRes.json()
          const found = (categories ?? []).find(
            (item: any) => item.name?.toLowerCase() === category.name.toLowerCase()
          )
          if (found) {
            matched = {
              avg_price: found.avg_price ?? null,
              median_price: found.median_price ?? null,
              p25_price: found.p25_price ?? null,
              p75_price: found.p75_price ?? null,
              price_sample: found.price_sample ?? null,
              volume_active: found.volume_active ?? 0,
              trend_direction: found.trend_direction ?? null,
              price_change_percent: found.price_change_percent ?? null,
              history_days: found.history_days ?? 0,
              confidence: found.confidence ?? 'insuffisant',
              quality_note: found.quality_note ?? null,
              last_analyzed_at: found.last_analyzed_at ?? null,
            }
          }
        }

        if (mounted) {
          setProducts(products ?? [])
          setStats(matched)
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Erreur de chargement')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (slug) void load()
    return () => {
      mounted = false
    }
  }, [slug, category])

  if (!category) {
    return (
      <main className="min-h-screen bg-background px-6 py-20 text-foreground">
        <div className="mx-auto max-w-7xl">
          <Link href="/categories" className="mb-6 inline-flex items-center gap-2 text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Retour aux catégories
          </Link>
          <p className="text-rose-300">Catégorie non trouvée</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-6 py-20 text-foreground">
      <div className="mx-auto max-w-7xl">
        <Link href="/categories" className="mb-6 inline-flex items-center gap-2 text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Retour aux catégories
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="panel-strong mb-12 p-8"
        >
          <div className="flex items-start gap-6">
            <div className="text-6xl">{category.icon}</div>
            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-bold">{category.name}</h1>
                <TrendBadge direction={stats?.trend_direction ?? null} percent={stats?.price_change_percent ?? null} />
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${confiance.classe}`}
                  title={stats?.quality_note ?? undefined}
                >
                  {confiance.texte}
                </span>
              </div>
              <p className="mb-6 text-muted-foreground">
                Annonces Vinted réellement collectées dans cette catégorie. Les prix affichés sont des prix{' '}
                <strong className="font-medium text-foreground">demandés</strong> : Vinted ne publie aucune
                transaction.
              </p>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Prix demandé médian</p>
                  <p className="text-2xl font-bold tabular-nums">{formatOrDash(stats?.median_price ?? null, '€')}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {stats?.price_sample ? `sur ${stats.price_sample} annonces récentes` : 'relevé en cours'}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Fourchette courante</p>
                  <p className="text-2xl font-bold tabular-nums">
                    {stats?.p25_price === null || stats?.p25_price === undefined || stats?.p75_price === null || stats?.p75_price === undefined
                      ? '—'
                      : `${Math.round(stats.p25_price)} – ${Math.round(stats.p75_price)} €`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">la moitié des annonces</p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Annonces suivies</p>
                  <p className="text-2xl font-bold tabular-nums">{stats?.volume_active ?? products.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    prix moyen {formatOrDash(stats?.avg_price ?? null, ' €')}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Dernière analyse</p>
                  <p className="text-sm text-muted-foreground">
                    {stats?.last_analyzed_at ? new Date(stats.last_analyzed_at).toLocaleString('fr-FR') : '—'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {joursHistorique} jour{joursHistorique > 1 ? 's' : ''} de relevés
                  </p>
                </div>
              </div>

              {/* Ce que vaut la mesure, écrit à côté du chiffre : un prix médian
                  calculé sur un jour de relevés se lit sinon comme un prix établi. */}
              <p className="mt-4 text-xs text-muted-foreground">{stats?.quality_note ?? 'Mesure en cours.'}</p>
            </div>
          </div>
        </motion.div>

        <CategoryHistory category={category?.name ?? slug} />

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="h-48 animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-rose-100">{error}</div>
        ) : products.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.025] py-12 text-center">
            <p className="text-muted-foreground">Aucune annonce collectée pour l'instant dans cette catégorie.</p>
            <p className="mt-1 text-sm text-muted-foreground">Le robot analyse le marché chaque jour, revenez bientôt.</p>
          </div>
        ) : (
          <StaggerGroup className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product, index) => (
              <motion.div
                key={`${product.title}-${index}`}
                variants={staggerItem}
                className="panel panel-hover group overflow-hidden p-5"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold tabular-nums text-slate-200">
                    #{index + 1}
                  </span>
                  {conditionLabel(product.condition) && (
                    <span className="text-xs text-muted-foreground">{conditionLabel(product.condition)}</span>
                  )}
                </div>

                <h3 className="mb-2 line-clamp-2 font-semibold">{product.title}</h3>
                <p className="mb-3 text-sm text-muted-foreground">
                  {product.brand || 'Marque non précisée'}
                  {product.size ? ` · ${product.size}` : ''}
                </p>

                <div className="mb-4 flex items-end justify-between">
                  <p className="text-2xl font-bold tabular-nums">{product.price.toFixed(0)}€</p>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Marge</p>
                    <p className={`font-semibold tabular-nums ${product.profitMargin === null ? 'text-muted-foreground' : 'text-primary'}`}>
                      {product.profitMargin === null ? '—' : `${Math.round(product.profitMargin)}%`}
                    </p>
                  </div>
                </div>

                {product.url && (
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary transition hover:bg-primary/20"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Voir sur Vinted
                  </a>
                )}
              </motion.div>
            ))}
          </StaggerGroup>
        )}
      </div>
    </main>
  )
}
