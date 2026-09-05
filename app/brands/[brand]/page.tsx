'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { StaggerGroup, staggerItem } from '@/components/ui/reveal'

/**
 * Cette page lisait sales, demandScore, timesSold, trend, trendPercent et id,
 * qu'aucune route ne renvoie : elle affichait « Total des ventes : NaN »,
 * « Demande moyenne : NaN% », « +undefined% », « Ventes : undefined » et
 * « undefined vendu ». /api/vinted/brand-products ne renvoie que les champs
 * ci-dessous, tous lus sur les annonces réellement collectées.
 *
 * Aucune notion de vente ici : Vinted ne publie pas les transactions, seuls
 * les prix demandés sont observables.
 */
interface Product {
  id: string
  vintedId?: string | null
  title: string
  brand: string | null
  price: number
  size: string | null
  condition: string | null
  category: string | null
  url: string | null
  imageUrl: string | null
  profitMargin: number | null
  analysisScore: number | null
  // Favoris relevés sur Vinted : un signal d'intérêt, pas une vente.
  favouriteCount?: number | null
}

/** Le robot stocke l'état renvoyé par Vinted en anglais ; on l'affiche en français. */
const ETATS: Record<string, string> = {
  new: 'Neuf',
  like_new: 'Comme neuf',
  good: 'Bon état',
  fair: 'État correct',
  poor: 'État moyen',
}

function etatLisible(condition: string | null) {
  if (!condition) return null
  return ETATS[condition] ?? condition
}

function estNombre(valeur: unknown): valeur is number {
  return typeof valeur === 'number' && Number.isFinite(valeur)
}

function medianeDesPrix(prix: number[]): number | null {
  if (prix.length === 0) return null
  const tries = [...prix].sort((a, b) => a - b)
  const milieu = Math.floor(tries.length / 2)
  return tries.length % 2 === 0 ? (tries[milieu - 1] + tries[milieu]) / 2 : tries[milieu]
}

export default function BrandPage() {
  const params = useParams()
  const brandName = decodeURIComponent(params.brand as string)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true)
      setError('')

      try {
        const res = await fetch(`/api/vinted/brand-products?brand=${encodeURIComponent(brandName)}`)
        const data = await res.json().catch(() => ({}))
        // La route répond 503 avec un message explicite quand la base ne suit
        // plus : on le montre plutôt qu'un « Erreur de chargement » générique.
        if (!res.ok) throw new Error(data?.error ?? 'Impossible de charger les annonces')

        setProducts(Array.isArray(data.products) ? data.products : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement')
      } finally {
        setLoading(false)
      }
    }

    if (brandName) {
      fetchProducts()
    }
  }, [brandName])

  // Calculé sur les seules annonces affichées, et dit comme tel : la route en
  // renvoie vingt au maximum, ce n'est pas la médiane de toute la marque.
  const prixValides = useMemo(() => products.map((p) => p.price).filter(estNombre), [products])
  const prixMedian = useMemo(() => medianeDesPrix(prixValides), [prixValides])

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <Link href="/brands" className="inline-flex items-center gap-2 text-primary hover:underline mb-6">
            <ArrowLeft className="w-4 h-4" />
            Retour aux marques
          </Link>
          <div className="h-12 w-12 rounded-full border border-primary/30 animate-pulse bg-primary/10" />
          <p className="mt-6 text-muted-foreground">Chargement des annonces...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <Link href="/brands" className="inline-flex items-center gap-2 text-primary hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" />
          Retour aux marques
        </Link>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="mb-12 panel-strong p-8">
          <h1 className="text-4xl font-bold mb-2">{brandName}</h1>
          <p className="text-muted-foreground">Jusqu'à 20 annonces collectées pour cette marque, classées par score d'analyse puis par prix demandé.</p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Annonces affichées</p>
              <p className="text-3xl font-bold tabular-nums">{products.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Prix demandé médian</p>
              <p className="text-3xl font-bold tabular-nums">
                {prixMedian === null ? '—' : `${Math.round(prixMedian)} €`}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {prixMedian === null ? 'aucun prix relevé' : `sur les ${prixValides.length} annonces affichées`}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Fourchette des prix demandés</p>
              <p className="text-3xl font-bold tabular-nums">
                {prixValides.length === 0
                  ? '—'
                  : `${Math.round(Math.min(...prixValides))} – ${Math.round(Math.max(...prixValides))} €`}
              </p>
            </div>
          </div>

          <p className="mt-6 text-xs leading-5 text-muted-foreground">
            Prix <strong className="font-medium">demandés</strong>, jamais prix de vente : Vinted ne publie aucune
            transaction. Une annonce qui disparaît a pu être vendue ou simplement retirée.
          </p>
        </motion.div>

        {error ? (
          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-rose-100">
            {error}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucune annonce collectée pour cette marque</p>
          </div>
        ) : (
          <StaggerGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, index) => {
              const etat = etatLisible(product.condition)
              return (
                <motion.div
                  key={product.id ?? product.vintedId ?? `${product.title}-${index}`}
                  variants={staggerItem}
                  className="panel panel-hover p-5 overflow-hidden group"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">#{index + 1}</span>
                    <span className="text-xs text-muted-foreground">
                      {estNombre(product.analysisScore) ? `Score ${Math.round(product.analysisScore)}/100` : 'Score —'}
                    </span>
                  </div>

                  <div className="mb-4">
                    <h3 className="font-semibold line-clamp-2 mb-2">{product.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{product.category || 'Catégorie inconnue'}</p>

                    <div className="flex items-end justify-between mb-3">
                      <div>
                        <p className="text-2xl font-bold tabular-nums">{estNombre(product.price) ? `${Math.round(product.price)} €` : '—'}</p>
                        <p className="text-xs text-muted-foreground">prix demandé</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Marge estimée</p>
                        <p className={`font-semibold ${estNombre(product.profitMargin) ? 'text-primary' : 'text-muted-foreground'}`}>
                          {estNombre(product.profitMargin) ? `${Math.round(product.profitMargin)}%` : '—'}
                        </p>
                      </div>
                    </div>

                    {!estNombre(product.profitMargin) && (
                      <p className="mb-3 text-[11px] text-muted-foreground">
                        Marge non calculée : l'analyse IA n'a pas encore traité cette annonce.
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4">
                      <div>Taille : {product.size || '—'}</div>
                      <div>État : {etat ?? '—'}</div>
                      <div title="Favoris relevés sur Vinted : un signal d'intérêt, pas une vente.">
                        Favoris : {estNombre(product.favouriteCount) ? product.favouriteCount : '—'}
                      </div>
                    </div>

                    {product.url && (
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-fit items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary transition hover:bg-primary/20"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Voir l'annonce
                      </a>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </StaggerGroup>
        )}
      </div>
    </main>
  )
}
