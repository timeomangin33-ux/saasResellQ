'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { Star, Plus, Trash2 } from 'lucide-react'

const watchlists = [
  {
    id: '1',
    name: 'Nike Air Force',
    type: 'Produit',
    currentPrice: 75,
    alertPrice: 65,
  },
  {
    id: '2',
    name: 'PlayStation 5',
    type: 'Produit',
    currentPrice: 450,
    alertPrice: 400,
  },
  {
    id: '3',
    name: 'Mode Femme',
    type: 'Catégorie',
    currentGrowth: 45,
    alertGrowth: 60,
  },
]

export default function WatchlistsPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Watchlists</h1>
              <p className="text-muted-foreground">Suivez vos produits et catégories préférés</p>
            </div>
            <button className="bg-primary px-6 py-3 rounded-xl font-semibold text-white hover:bg-primary/90 transition flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Ajouter
            </button>
          </div>

          <div className="space-y-4">
            {watchlists.map((item) => (
              <div key={item.id} className="rounded-3xl border border-border/50 bg-card p-6 shadow-card">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{item.type}</p>
                    <div className="flex gap-6">
                      {item.type === 'Produit' ? (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground">Prix actuel</p>
                            <p className="font-bold">€{item.currentPrice}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Alerte à</p>
                            <p className="font-bold text-amber-400">€{item.alertPrice}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground">Croissance actuelle</p>
                            <p className="font-bold text-accent">+{item.currentGrowth}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Alerte si croissance &gt;</p>
                            <p className="font-bold">+{item.alertGrowth}%</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <button className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
