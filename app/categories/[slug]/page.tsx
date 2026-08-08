'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, TrendingUp, Star } from 'lucide-react'
import { VINTED_CATEGORIES } from '@/vinted'

interface Product {
  id: string
  title: string
  price: number
  originalPrice?: number
  brand: string
  category: string
  image?: string
  sales: number
  trend: 'up' | 'down' | 'stable'
  trendPercent: number
  profitMargin: number
  demandScore: number
  timesSold: number
}

export default function CategoryPage() {
  const params = useParams()
  const slug = params.slug as string
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const category = VINTED_CATEGORIES.find((c) => c.slug === slug)

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true)
      setError('')

      try {
        const res = await fetch(`/api/vinted/category-products?category=${slug}`)
        if (!res.ok) throw new Error('Impossible de charger les produits')

        const { products } = await res.json()
        setProducts(products ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement')
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      fetchProducts()
    }
  }, [slug])

  if (!category) {
    return (
      <main className="min-h-screen bg-background text-foreground px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <Link href="/categories" className="inline-flex items-center gap-2 text-primary hover:underline mb-6">
            <ArrowLeft className="w-4 h-4" />
            Retour aux catégories
          </Link>
          <p className="text-rose-300">Catégorie non trouvée</p>
        </div>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <Link href="/categories" className="inline-flex items-center gap-2 text-primary hover:underline mb-6">
            <ArrowLeft className="w-4 h-4" />
            Retour aux catégories
          </Link>
          <div className="h-12 w-12 rounded-full border border-primary/30 animate-pulse bg-primary/10" />
          <p className="mt-6 text-muted-foreground">Chargement des produits...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <Link href="/categories" className="inline-flex items-center gap-2 text-primary hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" />
          Retour aux catégories
        </Link>

        <div className="mb-12 rounded-3xl border border-border/50 bg-card p-8 shadow-card">
          <div className="flex items-start gap-6">
            <div className="text-6xl">{category.icon}</div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{category.name}</h1>
              <p className="text-muted-foreground mb-6">Top 20 des meilleurs produits de cette catégorie</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Score de demande</p>
                  <p className="text-2xl font-bold text-primary">{category.demandScore}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Croissance</p>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-300" />
                    <p className="text-2xl font-bold text-emerald-300">+{category.growthRate}%</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Ventes totales</p>
                  <p className="text-2xl font-bold">{category.totalSales.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Prix moyen</p>
                  <p className="text-2xl font-bold">€{category.averagePrice}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-rose-100">
            {error}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucun produit trouvé pour cette catégorie</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, index) => (
              <div
                key={product.id}
                className="rounded-3xl border border-border/50 bg-card p-5 shadow-card hover:shadow-glow-blue transition overflow-hidden group"
              >
                <div className="mb-4 rounded-3xl bg-muted/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">#{index + 1}</span>
                    <span className="text-xs font-semibold text-foreground">
                      {product.trend === 'up'
                        ? `+${product.trendPercent}%`
                        : product.trend === 'down'
                        ? `-${product.trendPercent}%`
                        : 'Stable'}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="font-semibold line-clamp-2 mb-2">{product.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{product.brand}</p>

                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <p className="text-2xl font-bold">€{product.price}</p>
                      {product.originalPrice && (
                        <p className="text-xs text-muted-foreground line-through">€{product.originalPrice}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Marge</p>
                      <p className="font-semibold text-primary">{product.profitMargin}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4">
                    <div>Ventes: {product.sales}</div>
                    <div>Demande: {product.demandScore}%</div>
                  </div>

                  <div className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full w-fit">
                    <Star className="w-3 h-3" />
                    {product.timesSold} vendu{product.timesSold > 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
