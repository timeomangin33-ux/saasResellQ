'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, BarChart3, List, Tags } from 'lucide-react'
import DashboardLayout from '@/app/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { StaggerGroup, staggerItem } from '@/components/ui/reveal'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { Magnetic } from '@/components/ui/magnetic'

/**
 * Cette page affichait `brand.totalSales.toLocaleString()` alors que
 * /api/vinted/top-brands ne renvoie aucun champ totalSales : la page entière
 * plantait sur un TypeError et restait blanche. Elle affichait aussi un
 * « Taux de rotation » qui n'était que la moyenne du score d'analyse IA, un
 * « % » sans chiffre devant tant que cette analyse n'avait pas tourné, et une
 * barre de progression à `width: "null%"`.
 *
 * Ne restent que les champs réellement renvoyés par la route. Ils sont tous
 * traités comme potentiellement absents : la route évolue, et une clé manquante
 * ne doit plus jamais casser le rendu ni produire un chiffre inventé.
 */
interface Brand {
  id?: string | null
  brand: string
  category?: string | null
  productCount?: number | null
  // Prix demandés uniquement : Vinted ne publie aucune transaction.
  avgPrice?: number | null
  minPrice?: number | null
  maxPrice?: number | null
  avgProfitMargin?: number | null
  // Moyenne de Product.analysisScore (0-100), nulle tant que la passe IA n'a
  // pas tourné. Ce n'est pas un taux de rotation.
  averageDemandScore?: number | null
  totalFavourites?: number | null
  // Annonces qui ne sont plus en vente : vendues OU retirées, indiscernables.
  noLongerListedCount?: number | null
}

const VIEW_TYPES = [
  { value: 'cards', label: 'Cartes', icon: BarChart3 },
  { value: 'table', label: 'Tableau', icon: List },
]

/** Un nombre réel, ou null : « pas mesuré » ne vaut pas 0. */
function nombre(valeur: number | null | undefined): number | null {
  return typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : null
}

function euros(valeur: number | null | undefined): string {
  const v = nombre(valeur)
  return v === null ? '—' : `${Math.round(v)} €`
}

function entier(valeur: number | null | undefined): string {
  const v = nombre(valeur)
  return v === null ? '—' : v.toLocaleString('fr-FR')
}

function fourchette(brand: Brand): string | null {
  const min = nombre(brand.minPrice)
  const max = nombre(brand.maxPrice)
  if (min === null || max === null) return null
  return `${Math.round(min)} – ${Math.round(max)} €`
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewType, setViewType] = useState<'cards' | 'table'>('cards')

  useEffect(() => {
    let mounted = true
    fetch('/api/vinted/top-brands')
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return { brands: [], message: data?.error ?? 'Impossible de charger les marques.' }
        return data
      })
      .then((data) => {
        if (!mounted) return
        setBrands(Array.isArray(data.brands) ? data.brands : [])
        setMessage(typeof data.message === 'string' ? data.message : null)
      })
      .catch(() => {
        if (!mounted) return
        setBrands([])
        setMessage('Impossible de charger les marques.')
      })
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  return (
    <DashboardLayout>
      <div className="page-container">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <PageHeader
              title="Marques populaires"
              kicker="Top 20 · le plus d'annonces collectées"
              icon={Tags}
              description="Les marques les plus représentées dans les annonces Vinted collectées, avec leurs prix demandés. Vinted ne publie aucune transaction : aucun prix de vente n'est mesurable."
            />
          </div>
          <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
            {VIEW_TYPES.map(type => {
              const Icon = type.icon
              return (
                <button
                  key={type.value}
                  onClick={() => setViewType(type.value as 'cards' | 'table')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    viewType === type.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title={type.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{type.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div className={viewType === 'table' ? 'space-y-2' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'}>
            {[...Array(9)].map((_, i) => (
              <div key={i} className={`overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] ${viewType === 'table' ? 'h-12' : 'h-44'}`}>
                <motion.div
                  className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  animate={{ x: ['-100%', '400%'] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'linear', delay: i * 0.05 }}
                />
              </div>
            ))}
          </div>
        ) : brands.length === 0 ? (
          <div className="panel p-12 text-center text-sm text-muted-foreground">
            {message ?? 'Aucune marque disponible pour le moment.'}
          </div>
        ) : viewType === 'table' ? (
          <SpotlightCard spotlightColor="rgba(16,185,129,0.12)">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="panel overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-5 py-3 text-left font-semibold text-muted-foreground">#</th>
                    <th className="px-5 py-3 text-left font-semibold text-muted-foreground">Marque</th>
                    <th className="px-5 py-3 text-left font-semibold text-muted-foreground">Catégorie</th>
                    <th className="px-5 py-3 text-right font-semibold text-muted-foreground">Prix demandé moyen</th>
                    <th className="px-5 py-3 text-right font-semibold text-muted-foreground">Annonces actives</th>
                    <th className="px-5 py-3 text-right font-semibold text-muted-foreground" title="Annonces qui ne sont plus en vente : vendues ou retirées, Vinted ne permet pas de trancher.">Plus en vente</th>
                    <th className="px-5 py-3 text-right font-semibold text-muted-foreground">Score d'analyse</th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map((brand, idx) => {
                    const score = nombre(brand.averageDemandScore)
                    return (
                      <tr key={brand.id ?? brand.brand} className="border-b border-border transition-colors hover:bg-emerald-500/[0.04]">
                        <td className="px-5 py-3 text-muted-foreground tabular-nums">#{idx + 1}</td>
                        <td className="px-5 py-3">
                          <Link href={`/brands/${encodeURIComponent(brand.brand)}`} className="font-medium text-foreground transition hover:text-emerald-300">
                            {brand.brand}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{brand.category || '—'}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-foreground">{euros(brand.avgPrice)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-foreground">{entier(brand.productCount)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{entier(brand.noLongerListedCount)}</td>
                        <td className="px-5 py-3 text-right tabular-nums" title={score === null ? "L'analyse IA n'a pas encore tourné sur les annonces de cette marque." : undefined}>
                          {score === null ? <span className="text-muted-foreground">—</span> : <span className="font-medium text-emerald-400">{score}/100</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="border-t border-border px-5 py-4 text-xs leading-5 text-muted-foreground">
                Prix <strong className="font-medium">demandés</strong> par les vendeurs, jamais prix de vente : Vinted ne
                publie aucune transaction. « Plus en vente » regroupe les annonces disparues du catalogue, vendues ou
                simplement retirées. Un tiret signale une valeur que le robot n'a pas encore mesurée.
              </p>
            </motion.div>
          </SpotlightCard>
        ) : (
          <StaggerGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {brands.map((brand, index) => {
              const score = nombre(brand.averageDemandScore)
              const marge = nombre(brand.avgProfitMargin)
              const favoris = nombre(brand.totalFavourites)
              const plage = fourchette(brand)
              return (
                <motion.div key={brand.id ?? brand.brand} variants={staggerItem}>
                  <SpotlightCard spotlightColor="rgba(16,185,129,0.14)" className="h-full">
                    <Link href={`/brands/${encodeURIComponent(brand.brand)}`} className="group block h-full">
                      <Card className="h-full transition-colors hover:border-emerald-400/30">
                        <CardContent className="pt-5 flex flex-col h-full">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-xs text-muted-foreground tabular-nums">#{index + 1}</p>
                              <h3 className="text-base font-semibold mt-0.5">{brand.brand}</h3>
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground mb-4">{brand.category || 'Catégorie inconnue'}</p>

                          <div className="space-y-2.5 mb-4 flex-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Prix demandé moyen</span>
                              <span className="font-medium tabular-nums text-foreground">{euros(brand.avgPrice)}</span>
                            </div>
                            {plage && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Fourchette</span>
                                <span className="font-medium tabular-nums text-foreground">{plage}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Annonces actives</span>
                              <span className="font-medium tabular-nums text-foreground">{entier(brand.productCount)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground" title="Annonces disparues du catalogue : vendues ou retirées, impossible de trancher.">Plus en vente</span>
                              <span className="font-medium tabular-nums text-foreground">{entier(brand.noLongerListedCount)}</span>
                            </div>
                            {favoris !== null && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground" title="Favoris cumulés sur les annonces collectées : un signal d'intérêt, pas une vente.">Favoris cumulés</span>
                                <span className="font-medium tabular-nums text-foreground">{favoris.toLocaleString('fr-FR')}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Marge estimée moyenne</span>
                              <span className={`font-medium tabular-nums ${marge === null ? 'text-muted-foreground' : 'text-emerald-400'}`}>
                                {marge === null ? '—' : `${marge}%`}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Score d'analyse</span>
                              <span className={`font-medium tabular-nums ${score === null ? 'text-muted-foreground' : 'text-emerald-400'}`}>
                                {score === null ? '—' : `${score}/100`}
                              </span>
                            </div>
                            {(score === null || marge === null) && (
                              <p className="text-[11px] text-muted-foreground">
                                Les valeurs manquantes attendent la passe d'analyse IA : rien n'est estimé à leur place.
                              </p>
                            )}
                          </div>

                          <Magnetic strength={0.1} className="w-full">
                            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-300 transition group-hover:bg-emerald-500/20 font-medium text-sm gap-1.5 group-hover:gap-2.5 w-full">
                              <span>Voir l'analyse</span>
                              <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
                            </div>
                          </Magnetic>
                        </CardContent>
                      </Card>
                    </Link>
                  </SpotlightCard>
                </motion.div>
              )
            })}
          </StaggerGroup>
        )}
      </div>
    </DashboardLayout>
  )
}
