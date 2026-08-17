'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/app/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal, StaggerGroup, staggerItem } from '@/components/ui/reveal'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { Magnetic } from '@/components/ui/magnetic'
import { NumberTicker } from '@/components/ui/number-ticker'
import { motion } from 'framer-motion'
import { ShieldAlert, Users, Activity, ExternalLink, Loader2, Mail, Package, Link2 } from 'lucide-react'
import Link from 'next/link'

interface AdminStats {
  totalUsers: number
  usersThisMonth: number
  userGrowthPct: number
  activeSubscriptions: number
  activeByPlan: Record<string, number>
  mrr: number
  productsCount: number
  vintedAccountsCount: number
  jobsLast24h: number
  failedJobsLast24h: number
  webhookEventsLast24h: number
  recentUsers: Array<{
    id: string
    email: string
    name: string | null
    subscriptionPlan: string
    subscriptionStatus: string
    role: string
    createdAt: string
  }>
}

export default function AdminPanelPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Impossible de charger les statistiques.')
        }
        return res.json()
      })
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur inconnue.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl">
          <PageHeader
            title="Admin Panel"
            kicker="Administration"
            icon={ShieldAlert}
            description="Gestion de la plateforme et santé métier — données en temps réel"
            actions={
              stats ? (
                stats.failedJobsLast24h > 0 ? (
                  <div className="chip border-red-500/20 bg-red-500/10 text-red-300">
                    {stats.failedJobsLast24h} échec{stats.failedJobsLast24h !== 1 ? 's' : ''} (24h)
                  </div>
                ) : (
                  <div className="chip border-emerald-500/20 bg-emerald-500/10 text-emerald-200">Aucun échec (24h)</div>
                )
              ) : null
            }
          />

          {loading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {!loading && error && <div className="panel p-6 text-sm text-red-400">{error}</div>}

          {!loading && stats && (
            <>
              <StaggerGroup className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <motion.div variants={staggerItem}>
                  <SpotlightCard spotlightColor="rgba(16,185,129,0.14)" className="panel panel-hover p-6">
                    <p className="mb-2 text-sm text-muted-foreground">Utilisateurs totaux</p>
                    <p className="stat-value"><NumberTicker value={stats.totalUsers} /></p>
                    <p className={`mt-2 text-xs ${stats.userGrowthPct >= 0 ? 'text-accent' : 'text-red-400'}`}>
                      {stats.userGrowthPct >= 0 ? '+' : ''}{stats.userGrowthPct}% ce mois ({stats.usersThisMonth} nouveaux)
                    </p>
                  </SpotlightCard>
                </motion.div>
                <motion.div variants={staggerItem}>
                  <SpotlightCard spotlightColor="rgba(16,185,129,0.14)" className="panel panel-hover p-6">
                    <p className="mb-2 text-sm text-muted-foreground">Abonnements actifs</p>
                    <p className="stat-value"><NumberTicker value={stats.activeSubscriptions} /></p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {Object.entries(stats.activeByPlan).map(([plan, n]) => `${plan}: ${n}`).join(' · ') || 'Aucun abonnement actif'}
                    </p>
                  </SpotlightCard>
                </motion.div>
                <motion.div variants={staggerItem}>
                  <SpotlightCard spotlightColor="rgba(16,185,129,0.14)" className="panel panel-hover p-6">
                    <p className="mb-2 text-sm text-muted-foreground">MRR estimé</p>
                    <p className="stat-value"><NumberTicker value={stats.mrr} prefix="€" /></p>
                    <p className="mt-2 text-xs text-muted-foreground">Basé sur les abonnements actifs</p>
                  </SpotlightCard>
                </motion.div>
                <motion.div variants={staggerItem}>
                  <SpotlightCard spotlightColor="rgba(16,185,129,0.14)" className="panel panel-hover p-6">
                    <p className="mb-2 text-sm text-muted-foreground">Jobs automation (24h)</p>
                    <p className="stat-value"><NumberTicker value={stats.jobsLast24h} /></p>
                    <p className={`mt-2 text-xs ${stats.failedJobsLast24h > 0 ? 'text-red-400' : 'text-accent'}`}>
                      {stats.failedJobsLast24h} échec{stats.failedJobsLast24h !== 1 ? 's' : ''}
                    </p>
                  </SpotlightCard>
                </motion.div>
              </StaggerGroup>

              <SpotlightCard spotlightColor="rgba(16,185,129,0.1)">
              <Reveal className="mb-8 panel p-8">
                <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
                  <Users className="h-6 w-6" />
                  Derniers inscrits
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="px-4 py-3 text-left font-semibold">Email</th>
                        <th className="px-4 py-3 text-left font-semibold">Plan</th>
                        <th className="px-4 py-3 text-left font-semibold">Inscrit</th>
                        <th className="px-4 py-3 text-left font-semibold">Statut</th>
                        <th className="px-4 py-3 text-left font-semibold">Contact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentUsers.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Aucun utilisateur.</td></tr>
                      ) : stats.recentUsers.map((user) => (
                        <tr key={user.id} className="border-b border-border/50 transition hover:bg-muted/30">
                          <td className="px-4 py-3">{user.email}{user.role === 'ADMIN' && <span className="ml-2 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">ADMIN</span>}</td>
                          <td className="px-4 py-3"><span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{user.subscriptionPlan}</span></td>
                          <td className="px-4 py-3 text-muted-foreground">{new Date(user.createdAt).toLocaleDateString('fr-FR')}</td>
                          <td className="px-4 py-3">
                            <span className={`font-semibold ${user.subscriptionStatus === 'ACTIVE' ? 'text-accent' : 'text-muted-foreground'}`}>
                              {user.subscriptionStatus === 'ACTIVE' ? 'Actif' : user.subscriptionStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <a href={`mailto:${user.email}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground">
                              <Mail className="h-3.5 w-3.5" /> Contacter
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Reveal>
              </SpotlightCard>

              <div className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <SpotlightCard spotlightColor="rgba(16,185,129,0.1)">
                  <Reveal delay={0.06} className="panel p-8">
                    <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
                      <Activity className="h-6 w-6" />
                      Santé du système
                    </h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-4">
                        <span className="font-semibold">Produits en base</span>
                        <span className="flex items-center gap-1.5 font-bold text-accent"><Package className="h-4 w-4" />{stats.productsCount.toLocaleString('fr-FR')}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-4">
                        <span className="font-semibold">Comptes Vinted connectés</span>
                        <span className="flex items-center gap-1.5 font-bold text-accent"><Link2 className="h-4 w-4" />{stats.vintedAccountsCount.toLocaleString('fr-FR')}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-4">
                        <span className="font-semibold">Webhooks Stripe (24h)</span>
                        <span className="font-bold text-accent">{stats.webhookEventsLast24h}</span>
                      </div>
                    </div>
                  </Reveal>
                </SpotlightCard>

                <SpotlightCard spotlightColor="rgba(16,185,129,0.1)">
                  <Reveal delay={0.1} className="panel p-8">
                    <h2 className="mb-6 text-2xl font-bold">Raccourcis</h2>
                    <div className="space-y-3">
                      <Magnetic strength={0.08} className="block w-full">
                        <a
                          href="https://dashboard.stripe.com"
                          target="_blank"
                          rel="noreferrer"
                          className="flex w-full items-center justify-between gap-2 rounded-xl border border-border/50 px-4 py-3 text-left font-semibold transition hover:border-emerald-400/30 hover:bg-muted/50"
                        >
                          Dashboard Stripe <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </a>
                      </Magnetic>
                      <Magnetic strength={0.08} className="block w-full">
                        <Link
                          href="/pricing"
                          className="flex w-full items-center justify-between gap-2 rounded-xl border border-border/50 px-4 py-3 text-left font-semibold transition hover:border-emerald-400/30 hover:bg-muted/50"
                        >
                          Voir les forfaits publics <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      </Magnetic>
                    </div>
                  </Reveal>
                </SpotlightCard>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
