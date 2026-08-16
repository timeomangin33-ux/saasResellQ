'use client'

import DashboardLayout from '@/app/dashboard-layout'
import { ShieldAlert, Users, Activity, Sparkles, Settings2 } from 'lucide-react'

const users = [
  { id: '1', email: 'user@example.com', plan: 'Pro', signedUp: '15 Juin 2026', status: 'Actif' },
  { id: '2', email: 'another@example.com', plan: 'Starter', signedUp: '10 Juin 2026', status: 'Actif' },
]

export default function AdminPanelPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-8 w-8 text-red-500" />
              <div>
                <h1 className="text-3xl font-bold">Admin Panel</h1>
                <p className="text-sm text-muted-foreground">Gestion de la plateforme et du healthcheck métier</p>
              </div>
            </div>
            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-200">Plateforme stable</div>
          </div>

          <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-border/50 bg-card p-6 shadow-card">
              <p className="mb-2 text-sm text-muted-foreground">Utilisateurs actifs</p>
              <p className="text-4xl font-bold">1,247</p>
              <p className="mt-2 text-xs text-accent">+12% ce mois</p>
            </div>
            <div className="rounded-3xl border border-border/50 bg-card p-6 shadow-card">
              <p className="mb-2 text-sm text-muted-foreground">Abonnements actifs</p>
              <p className="text-4xl font-bold">847</p>
              <p className="mt-2 text-xs text-accent">+8% ce mois</p>
            </div>
            <div className="rounded-3xl border border-border/50 bg-card p-6 shadow-card">
              <p className="mb-2 text-sm text-muted-foreground">Revenus MRR</p>
              <p className="text-4xl font-bold">€24,563</p>
              <p className="mt-2 text-xs text-accent">+15% ce mois</p>
            </div>
            <div className="rounded-3xl border border-border/50 bg-card p-6 shadow-card">
              <p className="mb-2 text-sm text-muted-foreground">Taux de rétention</p>
              <p className="text-4xl font-bold">92%</p>
              <p className="mt-2 text-xs text-accent">Excellent</p>
            </div>
          </div>

          <div className="mb-8 rounded-3xl border border-border/50 bg-card p-8 shadow-card">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
              <Users className="h-6 w-6" />
              Gestion des utilisateurs
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-4 py-3 text-left font-semibold">Email</th>
                    <th className="px-4 py-3 text-left font-semibold">Plan</th>
                    <th className="px-4 py-3 text-left font-semibold">Inscrit</th>
                    <th className="px-4 py-3 text-left font-semibold">Statut</th>
                    <th className="px-4 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border/50 transition hover:bg-muted/30">
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3"><span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{user.plan}</span></td>
                      <td className="px-4 py-3 text-muted-foreground">{user.signedUp}</td>
                      <td className="px-4 py-3"><span className="font-semibold text-accent">{user.status}</span></td>
                      <td className="px-4 py-3"><button className="text-sm text-muted-foreground transition hover:text-foreground">Voir</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-border/50 bg-card p-8 shadow-card">
              <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
                <Activity className="h-6 w-6" />
                Santé du système
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-4"><span className="font-semibold">API disponibilité</span><span className="font-bold text-accent">99.9%</span></div>
                <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-4"><span className="font-semibold">Temps de réponse moyen</span><span className="font-bold text-accent">124ms</span></div>
                <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-4"><span className="font-semibold">Erreurs 24h</span><span className="font-bold text-accent">12</span></div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/50 bg-card p-8 shadow-card">
              <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
                <Settings2 className="h-6 w-6" />
                Actions rapides
              </h2>
              <div className="space-y-3">
                <button className="flex w-full items-center gap-2 rounded-xl border border-border/50 px-4 py-3 text-left font-semibold transition hover:bg-muted/50"><Sparkles className="h-4 w-4 text-primary" /> Modifier les plans d';abonnement</button>
                <button className="flex w-full items-center gap-2 rounded-xl border border-border/50 px-4 py-3 text-left font-semibold transition hover:bg-muted/50"><Sparkles className="h-4 w-4 text-primary" /> Paramètres Stripe</button>
                <button className="flex w-full items-center gap-2 rounded-xl border border-border/50 px-4 py-3 text-left font-semibold transition hover:bg-muted/50"><Sparkles className="h-4 w-4 text-primary" /> Sauvegardes</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
