'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'

interface BotItem {
  id: string
  title: string
  price: number
  brand: string
  category: string
  image: string
  url: string
  description: string
}

interface BotResult {
  success: boolean
  source: 'live' | 'fallback'
  query: string
  items: BotItem[]
  message: string
}

interface TopCategory {
  name: string
  category?: string
  trend_direction?: string
  trend_strength?: string
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
          body: JSON.stringify({ query: value, perPage: 8, category: value }),
        })

        const data = await response.json()
        setResult(data)
      } catch (error) {
        setResult({
          success: false,
          source: 'fallback',
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
    }, 18000)

    return () => window.clearInterval(interval)
  }, [autoRotate, topCategories])

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-500">Bot Vinted</p>
              <h1 className="mt-2 text-3xl font-semibold text-foreground">Les dernières annonces Vinted défilent ici</h1>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                Ce module récupère désormais les annonces Vinted visibles sur la page de recherche et les affiche dans un flux défilant dans le SaaS.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
              État : flux live
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/70 p-4 sm:flex-row sm:items-center">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex : nike, louis vuitton, iphone"
              className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-0"
            />
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
        </div>

        {result && (
          <div className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Résultat du dernier scan</p>
                <p className="text-lg font-semibold text-foreground">{result.query}</p>
              </div>
              <div className={`rounded-full px-3 py-1 text-sm ${result.source === 'live' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                {result.source === 'live' ? 'Scan live' : 'Résultat de secours'}
              </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">{result.message}</p>

            {result.items.length > 0 ? (
              <div className="mt-6 overflow-hidden rounded-2xl border border-border/70 bg-background/70 p-3">
                <div className="flex gap-4 animate-[marquee_24s_linear_infinite]">
                  {result.items.concat(result.items).map((item, index) => (
                    <article key={`${item.id}-${index}`} className="min-w-[270px] overflow-hidden rounded-2xl border border-border/70 bg-background">
                      <Image src={item.image} alt={item.title} width={360} height={144} className="h-36 w-full object-cover" />
                      <div className="space-y-2 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h2 className="text-base font-semibold text-foreground">{item.title}</h2>
                            <p className="text-sm text-muted-foreground">{item.brand}</p>
                          </div>
                          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-sm font-semibold text-emerald-600">
                            {item.price} €
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            {item.category}
                          </span>
                          <a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-emerald-600 hover:text-emerald-500">
                            Voir
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-6 rounded-2xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                Aucun résultat n'a encore été retourné par le bot.
              </p>
            )}
          </div>
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
