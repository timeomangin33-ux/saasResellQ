'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/app/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { ArrowRight, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface Product {
  title: string
  brand?: string
  price?: number
  demandScore?: number
  profitMargin?: number
  sales?: number
  url?: string
}

export default function TopProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function fetchProducts() {
      if (!mounted) return
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/vinted/top-products')
        if (!res.ok) throw new Error('Impossible de charger le top produits')
        const data = await res.json()
        if (mounted) setProducts(data.products ?? [])
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Erreur de chargement')
        if (mounted) setProducts([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchProducts()
    const id = setInterval(() => void fetchProducts(), 60000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [])

  return (
    <DashboardLayout>
      <div className="page-container py-8">
        <div className="mb-8 rounded-3xl border border-white/10 bg-[#0f172a]/70 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <PageHeader
            title="Top produits"
            description="Analysez les meilleures opportunités Vinted listées par prix, demande et marge potentielle."
          />
          <p className="mt-3 text-sm text-slate-400">Classement actualisé des produits à fort potentiel, issus de votre flux ou de la collecte Vinted.</p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-200">{error}</div>
        ) : null}

        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#111116] shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <div className="grid gap-4 border-b border-white/10 bg-[#0e1320] p-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-sm font-medium text-white">Top 20 des produits</p>
              <p className="mt-1 text-sm text-slate-500">Vue priorisée de l\'inventaire le plus utile à revendre.</p>
            </div>
            <Link href="/opportunities" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-violet-400/25 hover:bg-white/10">
              Voir les opportunités
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#0f172a] text-left text-xs uppercase tracking-[0.24em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3">Marque</th>
                  <th className="px-4 py-3">Prix</th>
                  <th className="px-4 py-3">Demande</th>
                  <th className="px-4 py-3">Marge</th>
                  <th className="px-4 py-3">Ventes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  [...Array(8)].map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="h-12 px-4"></td>
                      <td className="h-12 px-4"></td>
                      <td className="h-12 px-4"></td>
                      <td className="h-12 px-4"></td>
                      <td className="h-12 px-4"></td>
                      <td className="h-12 px-4"></td>
                    </tr>
                  ))
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">Aucun produit disponible. Vérifiez votre flux ou relancez la collecte.</td>
                  </tr>
                ) : (
                  products.slice(0, 20).map((product, index) => (
                    <tr key={`${product.title}-${index}`} className="hover:bg-white/5 transition">
                      <td className="px-4 py-4 text-white font-medium">{product.title}</td>
                      <td className="px-4 py-4 text-slate-300">{product.brand ?? '—'}</td>
                      <td className="px-4 py-4 text-slate-300">{product.price != null ? `${product.price}€` : '—'}</td>
                      <td className="px-4 py-4 text-slate-300">{product.demandScore != null ? `${product.demandScore}/100` : '—'}</td>
                      <td className="px-4 py-4 text-slate-300">{product.profitMargin != null ? `${product.profitMargin}%` : '—'}</td>
                      <td className="px-4 py-4 text-slate-300">{product.sales ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
