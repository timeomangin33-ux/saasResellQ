'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { Magnetic } from '@/components/ui/magnetic'

interface BotItem {
  id: string
  title: string
  price: number
  totalPrice: number
  brand: string
  size: string
  condition: string
  category: string
  image: string
  url: string
  description: string
  sellerLogin: string | null
  favouriteCount: number
  listedAt: string | null
}

interface BotResult {
  success: boolean
  /**
   * `api` : lecture normale, données complètes.
   * `html` : l'API a refusé, on a lu la page publique — vendeur et favoris
   * manquent alors, et l'interface le dit au lieu de laisser croire à zéro.
   * `failed` : aucune annonce lue. Aucune donnée inventée n'est affichée.
   */
  source: 'api' | 'html' | 'failed'
  query: string
  items: BotItem[]
  message: string
  failure?: { cause: string; detail: string }
  durationMs?: number
}

/** Il y a un mois. Sert à situer une annonce dans le temps sans dépendance. */
function depuis(iso: string | null) {
  if (!iso) return null
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (!Number.isFinite(minutes) || minutes < 0) return null
  if (minutes < 60) return `il y a ${minutes} min`
  const heures = Math.round(minutes / 60)
  if (heures < 48) return `il y a ${heures} h`
  return `il y a ${Math.round(heures / 24)} j`
}

interface TopCategory {
  name: string
  category?: string
  trend_direction?: string
  trend_strength?: string
}

const ETAT: Record<BotResult['source'], { libelle: string; court: string; classe: string; pastille: string }> = {
  api: {
    libelle: 'État : lecture directe de Vinted',
    court: 'Lecture API',
    classe: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    pastille: 'bg-emerald-500/10 text-emerald-300',
  },
  html: {
    libelle: 'État : lecture dégradée (page publique)',
    court: 'Lecture dégradée',
    classe: 'border-amber-500/20 bg-amber-500/10 text-amber-500',
    pastille: 'bg-amber-500/10 text-amber-600',
  },
  failed: {
    libelle: 'État : Vinted illisible',
    court: 'Échec',
    classe: 'border-red-500/30 bg-red-500/10 text-red-400',
    pastille: 'bg-red-500/10 text-red-400',
  },
}

export default function BotPage() {
  const [query, setQuery] = useState('nike')
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0)
  const [topCategories, setTopCategories] = useState<TopCategory[]>([])
  const [autoRotate, setAutoRotate] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BotResult | null>(null)

  const selectedCategory = useMemo(() => {
    if (topCategories.length > 0) {
      return topCategories[activeCategoryIndex]?.name || query
    }
    return query
  }, [topCategories, activeCategoryIndex, query])

  const runScan = useMemo(() => {
    return async (value: string) => {
      setLoading(true)
      try {
        const response = await fetch('/api/bot/vinted/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: value, perPage: 48, category: value }),
        })

        const data = await response.json()
        setResult(data)
      } catch (error) {
        setResult({
          success: false,
          source: 'failed',
          query: value,
          items: [],
          message: error instanceof Error ? error.message : 'Erreur inconnue lors du scan.',
        })
      } finally {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    async function loadTopCategories() {
      try {
        const res = await fetch('/api/vinted/top-categories')
        if (!res.ok) throw new Error('Impossible de charger les catégories')
        const data = await res.json()
        const categories = Array.isArray(data.categories) ? data.categories : []
        if (categories.length > 0) {
          setTopCategories(categories.slice(0, 20))
          setQuery(categories[0].name)
        }
      } catch {
        // fallback kept to manual query
      }
    }
    void loadTopCategories()
  }, [])

  useEffect(() => {
    if (!selectedCategory) return
    const id = window.setTimeout(() => { void runScan(selectedCategory) }, 0)
    return () => window.clearTimeout(id)
  }, [selectedCategory, runScan])

  useEffect(() => {
    if (!autoRotate || topCategories.length === 0) return

    const interval = window.setInterval(() => {
      setActiveCategoryIndex((prev) => (prev + 1) % topCategories.length)
    }, 45000)

    return () => window.clearInterval(interval)
  }, [autoRotate, topCategories])

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <SpotlightCard spotlightColor="rgba(16,185,129,0.14)">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="panel-strong p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-500">Bot Vinted</p>
              <h1 className="mt-2 text-3xl font-semibold text-foreground">Les dernières annonces Vinted défilent ici</h1>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                Ce module scanne les annonces Vinted en direct et alimente vos top produits et catégories avec ce qu'il trouve.
              </p>
            </div>
            <div className={`rounded-2xl border px-4 py-3 text-sm ${result ? ETAT[result.source].classe : 'border-border/70 bg-muted/60 text-muted-foreground'}`}>
              {result ? ETAT[result.source].libelle : 'État : en attente du premier scan'}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/70 p-4 sm:flex-row sm:items-center">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex : nike, louis vuitton, iphone"
              className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-0"
            />
            <Magnetic strength={0.2}>
              <button
                onClick={() => {
                  setAutoRotate(false)
                  setActiveCategoryIndex(0)
                  void runScan(query)
                }}
                disabled={loading}
                className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Scan en cours...' : 'Lancer le scan'}
              </button>
            </Magnetic>
          </div>
          {topCategories.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-muted/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Top categories</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {topCategories.slice(0, 10).map((category, index) => (
                    <button
                      key={`${category.name}-${index}`}
                      onClick={() => {
                        setAutoRotate(false)
                        setActiveCategoryIndex(index)
                        setQuery(category.name)
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs transition ${activeCategoryIndex === index ? 'bg-emerald-600 text-white' : 'bg-background border border-border text-muted-foreground hover:bg-muted'}`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/80 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Rotation</p>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={() => setAutoRotate((prev) => !prev)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${autoRotate ? 'bg-emerald-600 text-white' : 'bg-background border border-border text-muted-foreground hover:bg-muted'}`}
                  >
                    {autoRotate ? 'Arrêter' : 'Auto-rotate'}
                  </button>
                  <span className="text-sm text-muted-foreground">Query actuel : <strong>{selectedCategory}</strong></span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
        </SpotlightCard>

        {result && (
          <SpotlightCard spotlightColor="rgba(16,185,129,0.1)">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="panel p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Résultat du dernier scan</p>
                <p className="text-lg font-semibold text-foreground">{result.query}</p>
              </div>
              <div className={`rounded-full px-3 py-1 text-sm ${ETAT[result.source].pastille}`}>
                {ETAT[result.source].court}
                {result.durationMs ? ` · ${(result.durationMs / 1000).toFixed(1)} s` : ''}
              </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">{result.message}</p>

            {result.items.length > 0 ? (
              <div className="mt-6 overflow-hidden rounded-2xl border border-border/70 bg-background/70 p-3">
                <div className="flex gap-4 animate-[marquee_24s_linear_infinite]">
                  {result.items.concat(result.items).map((item, index) => (
                    <article key={`${item.id}-${index}`} className="min-w-[270px] overflow-hidden rounded-2xl border border-border/70 bg-background">
                      {item.image ? (
                        <Image src={item.image} alt={item.title} width={360} height={144} className="h-36 w-full object-cover" />
                      ) : (
                        // Pas d'image de remplacement : une photo prise ailleurs
                        // à côté d'une vraie annonce ferait croire que c'est
                        // l'article. Un cadre neutre dit la vérité.
                        <div className="flex h-36 w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                          Pas de photo
                        </div>
                      )}
                      <div className="space-y-2 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h2 className="text-base font-semibold text-foreground">{item.title}</h2>
                            <p className="text-sm text-muted-foreground">{item.brand}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-sm font-semibold text-emerald-300">
                            {item.price} €
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {item.totalPrice > item.price && <span>{item.totalPrice.toFixed(2)} € protection incluse</span>}
                          {item.favouriteCount > 0 && <span>{item.favouriteCount} ♥</span>}
                          {depuis(item.listedAt) && <span>{depuis(item.listedAt)}</span>}
                          {item.sellerLogin && <span className="truncate">@{item.sellerLogin}</span>}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            {item.category}
                          </span>
                          <a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-emerald-300 hover:text-emerald-500">
                            Voir
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              // Zéro annonce n'est pas « le marché est vide » : c'est une
              // panne de lecture. On le dit, avec la cause.
              <div className="mt-6 rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4 text-sm">
                <p className="font-medium text-amber-500">Le scan n'a rien pu lire sur Vinted.</p>
                <p className="mt-1 text-muted-foreground">{result.message}</p>
              </div>
            )}
          </motion.div>
          </SpotlightCard>
        )}
      </div>
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
