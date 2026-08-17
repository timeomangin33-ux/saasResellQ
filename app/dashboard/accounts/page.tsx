'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { ArrowRight, Layers3, ShieldCheck } from 'lucide-react'
import { Reveal, StaggerGroup, staggerItem } from '@/components/ui/reveal'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { NumberTicker } from '@/components/ui/number-ticker'

interface Account {
  id: string
  username: string
  updatedAt: string
  activeListings: number
  totalSales: number
  totalRevenue: number
}

export default function DashboardAccountsPage() {
  const { data: session, status } = useSession()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const business = session?.user?.subscriptionPlan === 'BUSINESS'

  useEffect(() => {
    if (!business) return
    async function loadAccounts() {
      setLoading(true)
      try {
        const res = await fetch('/api/vinted/accounts')
        if (!res.ok) throw new Error('Accès refusé')
        const data = await res.json()
        setAccounts(data.accounts ?? [])
      } catch {
        setAccounts([])
      } finally {
        setLoading(false)
      }
    }

    loadAccounts()
  }, [business])

  const totals = useMemo(() => ({
    activeListings: accounts.reduce((sum, a) => sum + a.activeListings, 0),
    totalSales: accounts.reduce((sum, a) => sum + a.totalSales, 0),
    totalRevenue: accounts.reduce((sum, a) => sum + a.totalRevenue, 0),
  }), [accounts])

  if (status === 'loading') return <div className="grid min-h-screen place-items-center bg-[#08080b]"><div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" /></div>

  if (!business) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-emerald-500/10 text-emerald-200">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold text-white">Accès multi-comptes réservé au forfait Business</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-zinc-400">Ce module vous offre une vue consolidée de tous vos comptes Vinted et de leur activité réelle.</p>
        <Link href="/pricing" className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-100">Découvrir Business <ArrowRight className="h-4 w-4" /></Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="kicker">Business</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Vue multi-comptes Vinted</h1>
          <p className="mt-2 text-sm text-zinc-400">Surveillez l'activité consolidée de tous vos comptes connectés.</p>
        </div>
        <Link href="/dashboard/device-lab" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500/15">Device Lab <ArrowRight className="h-4 w-4" /></Link>
      </motion.div>

      <StaggerGroup className="mt-6 grid gap-4 sm:grid-cols-3">
        <motion.div variants={staggerItem}><SummaryCard label="Comptes connectés" value={loading ? null : accounts.length} /></motion.div>
        <motion.div variants={staggerItem}><SummaryCard label="Annonces actives (total)" value={loading ? null : totals.activeListings} /></motion.div>
        <motion.div variants={staggerItem}><SummaryCard label="Revenu total" value={loading ? null : totals.totalRevenue} suffix="€" /></motion.div>
      </StaggerGroup>

      <SpotlightCard spotlightColor="rgba(16,185,129,0.1)">
        <Reveal delay={0.08} as="section" className="mt-6 panel-strong p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white">Comptes Vinted</p>
              <p className="mt-1 text-sm text-zinc-500">Activité réelle de chaque compte connecté, calculée depuis vos synchronisations.</p>
            </div>
            <Link href="/dashboard/device-lab" className="text-sm font-semibold text-emerald-300">Ouvrir Device Lab</Link>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {loading ? (
              [...Array(2)].map((_, index) => <SkeletonCard key={index} />)
            ) : accounts.length > 0 ? (
              accounts.map((account) => (
                <motion.div key={account.id} whileHover={{ y: -3 }} className="rounded-3xl border border-white/10 bg-white/5 p-5 transition-colors hover:border-emerald-400/25">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{account.username}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.24em] text-zinc-500">Synchronisé le {new Date(account.updatedAt).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">Actif</div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <MiniStat title="Annonces actives" value={account.activeListings.toString()} />
                    <MiniStat title="Ventes" value={account.totalSales.toString()} />
                    <MiniStat title="Revenu" value={`${account.totalRevenue}€`} />
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-zinc-400 lg:col-span-2">
                <p className="text-sm font-medium text-white">Aucun compte connecté pour l'instant</p>
                <p className="mt-2 text-sm">Connectez vos comptes Vinted depuis les paramètres pour alimenter votre dashboard multi-comptes.</p>
              </div>
            )}
          </div>
        </Reveal>
      </SpotlightCard>

      <SpotlightCard spotlightColor="rgba(16,185,129,0.1)">
        <Reveal delay={0.12} className="mt-6 panel-strong p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-white"><Layers3 className="h-4 w-4 text-emerald-300" /> Répartition par compte</div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {accounts.length === 0 && !loading ? (
              <p className="text-sm text-zinc-500">Aucune donnée à afficher.</p>
            ) : (
              accounts.map((account) => (
                <DetailCard key={account.id} title={account.username} value={`${account.totalRevenue}€`} description={`${account.totalSales} vente${account.totalSales !== 1 ? 's' : ''} · ${account.activeListings} annonce${account.activeListings !== 1 ? 's' : ''} active${account.activeListings !== 1 ? 's' : ''}`} />
              ))
            )}
          </div>
        </Reveal>
      </SpotlightCard>
    </div>
  )
}

function SummaryCard({ label, value, suffix = '' }: { label: string; value: number | null; suffix?: string }) {
  return (
    <div className="panel panel-hover p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">
        {value === null ? <span className="text-zinc-600">…</span> : <NumberTicker value={value} suffix={suffix} />}
      </p>
    </div>
  )
}

function MiniStat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-3 text-sm text-zinc-300">
      <p className="font-medium text-white">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.24em] text-zinc-500">{title}</p>
    </div>
  )
}

function DetailCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="h-40 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
      <motion.div
        className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{ x: ['-100%', '400%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}
