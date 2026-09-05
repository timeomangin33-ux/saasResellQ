'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/app/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { Magnetic } from '@/components/ui/magnetic'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, TrendingUp } from 'lucide-react'
import Link from 'next/link'

/**
 * Le tableau affichait une colonne « Ventes » sans aucune source — Vinted ne
 * publie pas les transactions, ce chiffre n'existe nulle part — et une colonne
 * « Demande » que /api/vinted/top-products ne remplit jamais. Ne restent que
 * les champs réellement renvoyés par la route.
 */
interface Product {
  title: string
  brand?: string | null
  price?: number | null
  profitMargin?: number | null
  analysisScore?: number | null
  url?: string | null
}

const RANK_STYLES = [
  'bg-gradient-to-br from-amber-300 to-yellow-500 text-zinc-950',
  'bg-gradient-to-br from-zinc-200 to-zinc-400 text-zinc-950',
  'bg-gradient-to-br from-amber-600 to-orange-700 text-white',
]

export default function TopProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

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
        if (mounted) {
          setProducts(data.products ?? [])
          setUpdatedAt(new Date())
        }
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
        <SpotlightCard spotlightColor="rgba(16,185,129,0.14)" className="panel mb-8 p-6">
          <PageHeader
            title="Top produits"
            kicker="Classement"
            icon={TrendingUp}
            description="Les annonces Vinted collectées, classées par score d'analyse puis par marge estimée. Prix demandés uniquement : Vinted ne publie aucun prix de vente."
            actions={
              updatedAt ? (
                <span className="chip border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
                  <motion.span className="h-1.5 w-1.5 rounded-full bg-emerald-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.8, repeat: Infinity }} />
                  Mis à jour {updatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              ) : undefined
            }
          />
        </SpotlightCard>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-200">
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <Reveal className="overflow-hidden rounded-[32px] border border-white/10 bg-[#0d0f0e] shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <div className="grid gap-4 border-b border-white/10 bg-emerald-500/[0.04] p-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-sm font-medium text-white">Top 20 des produits</p>
              <p className="mt-1 text-sm text-slate-500">Vue priorisée de l'inventaire le plus utile à revendre.</p>
            </div>
            <Magnetic strength={0.15}>
              <Link href="/opportunities" className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 transition hover:border-emerald-300/40 hover:bg-emerald-500/15">
                Voir les opportunités
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Magnetic>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-black/20 text-left text-xs uppercase tracking-[0.24em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3">Marque</th>
                  <th className="px-4 py-3">Prix demandé</th>
                  <th className="px-4 py-3">Score d'analyse</th>
                  <th className="px-4 py-3">Marge estimée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  [...Array(8)].map((_, index) => (
                    <tr key={index}>
                      <td colSpan={6} className="px-4 py-2">
                        <div className="h-9 overflow-hidden rounded-lg bg-white/[0.03]">
                          <motion.div
                            className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                            animate={{ x: ['-100%', '400%'] }}
                            transition={{ duration: 1.3, repeat: Infinity, ease: 'linear', delay: index * 0.05 }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">Aucun produit disponible. Vérifiez votre flux ou relancez la collecte.</td>
                  </tr>
                ) : (
                  products.slice(0, 20).map((product, index) => (
                    <motion.tr
                      key={`${product.title}-${index}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: Math.min(index, 10) * 0.03 }}
                      whileHover={{ backgroundColor: 'rgba(16,185,129,0.05)' }}
                      className="group transition-colors"
                    >
                      <td className="px-4 py-4">
                        <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${index < 3 ? RANK_STYLES[index] : 'bg-white/5 text-zinc-400'}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-medium text-white transition-colors group-hover:text-emerald-200">{product.title}</td>
                      <td className="px-4 py-4 text-slate-300">{product.brand ?? '—'}</td>
                      <td className="px-4 py-4 text-slate-300 tabular-nums">{product.price != null ? `${Math.round(product.price)}€` : '—'}</td>
                      <td className="px-4 py-4 text-slate-300 tabular-nums" title={product.analysisScore == null ? "Annonce pas encore passée par l'analyse IA." : undefined}>
                        {product.analysisScore != null ? `${Math.round(product.analysisScore)}/100` : '—'}
                      </td>
                      <td className={`px-4 py-4 font-medium tabular-nums ${product.profitMargin == null ? 'text-slate-500' : 'text-emerald-300'}`}>
                        {product.profitMargin != null ? (
                          `${Math.round(product.profitMargin)}%`
                        ) : (
                          <span title="Marge non calculée : l'analyse IA n'a pas encore traité cette annonce.">—</span>
                        )}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="border-t border-white/10 px-5 py-4 text-xs leading-5 text-slate-500">
            Un tiret dans « Score d'analyse » ou « Marge estimée » signifie que la passe IA n'a pas encore traité
            l'annonce : rien n'est estimé à sa place. Les prix affichés sont les prix <strong className="font-medium text-slate-400">demandés</strong>
            {' '}par les vendeurs, jamais des prix de vente.
          </p>
        </Reveal>
      </div>
    </DashboardLayout>
  )
}
