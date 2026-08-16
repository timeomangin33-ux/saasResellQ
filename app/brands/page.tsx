'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TrendingUp, ArrowRight, Clock, BarChart3, List } from 'lucide-react'
import { getTrendingBrands } from '@/vinted'
import DashboardLayout from '@/app/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
  const [brands] = useState<Brand[]>(() => getTrendingBrands(20))
  const [loading, setLoading] = useState(false)
  const [viewType, setViewType] = useState<'cards' | 'table'>('cards')

  

  if (loading) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <PageHeader
            title="Marques populaires"
            description="Découvrez les meilleures marques à revendre"
          />
          <div className={viewType === 'table' ? '' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'}>
            {[...Array(9)].map((_, i) => (
              <div key={i} className={viewType === 'table' ? 'h-12' : 'h-44'} />
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <PageHeader
              title="Marques populaires"
              description="Découvrez les meilleures marques à revendre avec les taux de rotation les plus élevés"
            />
            <p className="text-xs text-muted-foreground mt-2">Top 20 marques · Données calculées sur les 7 derniers jours.</p>
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

        {viewType === 'table' ? (
          <div className="overflow-x-auto border border-border rounded-lg bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3 text-left font-semibold text-muted-foreground">#</th>
                  <th className="px-5 py-3 text-left font-semibold text-muted-foreground">Marque</th>
                  <th className="px-5 py-3 text-left font-semibold text-muted-foreground">Catégorie</th>
                  <th className="px-5 py-3 text-right font-semibold text-muted-foreground">Taux de rotation</th>
                  <th className="px-5 py-3 text-right font-semibold text-muted-foreground">Ventes (7j)</th>
                  <th className="px-5 py-3 text-right font-semibold text-muted-foreground">Produits listés</th>
                </tr>
              </thead>
              <tbody>
                {brands.map((brand, idx) => (
                  <tr key={brand.brand} className="border-b border-border hover:bg-muted/20 transition">
                    <td className="px-5 py-3 text-muted-foreground tabular-nums">#{idx + 1}</td>
                    <td className="px-5 py-3">
                      <Link href={`/brands/${encodeURIComponent(brand.brand)}`} className="font-medium text-foreground hover:text-primary transition">
                        {brand.brand}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{brand.category}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      <span className="text-accent font-medium">{brand.averageDemandScore}%</span>
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
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {brands.map((brand, index) => (
              <Link key={brand.brand} href={`/brands/${encodeURIComponent(brand.brand)}`} className="group">
                <Card className="h-full hover:border-primary/30 transition-colors">
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
                        <span className="font-medium tabular-nums text-accent">{brand.averageDemandScore}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Ventes (7j)</span>
                        <span className="font-medium tabular-nums text-foreground">{brand.totalSales.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Produits listés</span>
                        <span className="font-medium tabular-nums text-foreground">{brand.productCount}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden pt-2">
                        <div
                          className="h-full bg-accent/70 rounded-full"
                          style={{ width: `${brand.averageDemandScore}%` }}
                        />
                      </div>
                    </div>

                    <button className="flex items-center justify-between px-3 py-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition font-medium text-sm group-hover:gap-2.5 gap-1.5 w-full">
                      <span>Voir l';analyse</span>
                      <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
                    </button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
