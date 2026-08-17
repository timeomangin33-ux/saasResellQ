'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { TrendingUp, ArrowRight, Clock, BarChart3, List, Tags, Sparkles } from 'lucide-react'
import DashboardLayout from '@/app/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StaggerGroup, staggerItem } from '@/components/ui/reveal'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { Magnetic } from '@/components/ui/magnetic'

interface Brand {
  brand: string
  category: string
  productCount: number
  totalSales: number
  averageDemandScore: number
}

const VIEW_TYPES = [
  { value: 'cards', label: 'Cartes', icon: BarChart3 },
  { value: 'table', label: 'Tableau', icon: List },
]

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [source, setSource] = useState<'db' | 'fallback' | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewType, setViewType] = useState<'cards' | 'table'>('cards')

  useEffect(() => {
    let mounted = true
    fetch('/api/vinted/top-brands')
      .then((res) => (res.ok ? res.json() : { brands: [], source: null }))
      .then((data) => {
        if (!mounted) return
        setBrands(data.brands ?? [])
        setSource(data.source ?? null)
      })
      .catch(() => mounted && setBrands([]))
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
              kicker="Top 20 · rotation la plus rapide"
              icon={Tags}
              description="Découvrez les meilleures marques à revendre avec les taux de rotation les plus élevés"
              actions={source === 'fallback' ? (
                <span className="chip border-amber-400/20 bg-amber-500/10 text-amber-300">
                  <Sparkles className="h-3 w-3" /> Démo
                </span>
              ) : source === 'db' ? (
                <span className="chip border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
                  <motion.span className="h-1.5 w-1.5 rounded-full bg-emerald-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.8, repeat: Infinity }} />
                  Live
                </span>
              ) : undefined}
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
          <div className="panel p-12 text-center text-sm text-muted-foreground">Aucune marque disponible pour le moment.</div>
        ) : viewType === 'table' ? (
          <SpotlightCard spotlightColor="rgba(16,185,129,0.12)">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="panel overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-5 py-3 text-left font-semibold text-muted-foreground">#</th>
                    <th className="px-5 py-3 text-left font-semibold text-muted-foreground">Marque</th>
                    <th className="px-5 py-3 text-left font-semibold text-muted-foreground">Catégorie</th>
                    <th className="px-5 py-3 text-right font-semibold text-muted-foreground">Taux de rotation</th>
                    <th className="px-5 py-3 text-right font-semibold text-muted-foreground">Ventes</th>
                    <th className="px-5 py-3 text-right font-semibold text-muted-foreground">Produits listés</th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map((brand, idx) => (
                    <tr key={brand.brand} className="border-b border-border transition-colors hover:bg-emerald-500/[0.04]">
                      <td className="px-5 py-3 text-muted-foreground tabular-nums">#{idx + 1}</td>
                      <td className="px-5 py-3">
                        <Link href={`/brands/${encodeURIComponent(brand.brand)}`} className="font-medium text-foreground transition hover:text-emerald-300">
                          {brand.brand}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{brand.category}</td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        <span className="font-medium text-emerald-400">{brand.averageDemandScore}%</span>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-foreground">
                        {brand.totalSales.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-foreground">
                        {brand.productCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </SpotlightCard>
        ) : (
          <StaggerGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {brands.map((brand, index) => (
              <motion.div key={brand.brand} variants={staggerItem}>
                <SpotlightCard spotlightColor="rgba(16,185,129,0.14)" className="h-full">
                  <Link href={`/brands/${encodeURIComponent(brand.brand)}`} className="group block h-full">
                    <Card className="h-full transition-colors hover:border-emerald-400/30">
                      <CardContent className="pt-5 flex flex-col h-full">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground tabular-nums">#{index + 1}</p>
                            <h3 className="text-base font-semibold mt-0.5">{brand.brand}</h3>
                          </div>
                          <Badge variant="success" className="gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {brand.averageDemandScore}%
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground mb-4">{brand.category}</p>

                        <div className="space-y-2.5 mb-4 flex-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Taux de rotation</span>
                            </div>
                            <span className="font-medium tabular-nums text-emerald-400">{brand.averageDemandScore}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Ventes</span>
                            <span className="font-medium tabular-nums text-foreground">{brand.totalSales.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Produits listés</span>
                            <span className="font-medium tabular-nums text-foreground">{brand.productCount}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden pt-2">
                            <motion.div
                              className="h-full rounded-full bg-emerald-400/70"
                              initial={{ width: 0 }}
                              animate={{ width: `${brand.averageDemandScore}%` }}
                              transition={{ duration: 0.8, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] }}
                            />
                          </div>
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
            ))}
          </StaggerGroup>
        )}
      </div>
    </DashboardLayout>
  )
}
