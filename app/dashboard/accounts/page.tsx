'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowRight, FileText, Layers3, ShieldCheck, UserCircle2 } from 'lucide-react'

interface Account {
  id: string
  username: string
  updatedAt: string
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

  if (status === 'loading') return <div className="grid min-h-screen place-items-center bg-[#09090b]"><div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" /></div>

  if (!business) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-violet-500/10 text-violet-200">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold text-white">Accès multi-comptes réservé au forfait Business</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-zinc-400">Ce module vous offre une vue consolidée de tous vos comptes Vinted, des KPI de performance et des rapports d’équipe.</p>
        <Link href="/pricing" className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-violet-100">Découvrir Business <ArrowRight className="h-4 w-4" /></Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-300">Business</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Vue multi-comptes Vinted</h1>
          <p className="mt-2 text-sm text-zinc-400">Surveillez l’activité consolidée de tous vos comptes et prenez des décisions plus rapides.</p>
        </div>
        <Link href="/dashboard/device-lab" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500/15">Device Lab <ArrowRight className="h-4 w-4" /></Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Comptes connectés" value={loading ? '…' : accounts.length.toString()} />
        <SummaryCard label="Performance globale" value="+18,4 %" />
        <SummaryCard label="Alertes Business" value="Prioritaires" />
        <SummaryCard label="Rapports" value="Export PDF / Excel" />
      </div>

      <section className="mt-6 rounded-[28px] border border-white/10 bg-[#111116] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white">Comptes Vinted</p>
            <p className="mt-1 text-sm text-zinc-500">Accédez rapidement à chaque compte connecté et à son état de synchronisation.</p>
          </div>
          <Link href="/dashboard/device-lab" className="text-sm font-semibold text-violet-300">Ouvrir Device Lab</Link>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {loading ? (
            [...Array(2)].map((_, index) => <SkeletonCard key={index} />)
          ) : accounts.length > 0 ? (
            accounts.map((account) => (
              <div key={account.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{account.username}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.24em] text-zinc-500">Synchronisé le {new Date(account.updatedAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">Actif</div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <MiniStat title="Articles actifs" value="128" />
                  <MiniStat title="Marge moyenne" value="24 %" />
                  <MiniStat title="Alertes" value="12" />
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-zinc-400">
              <p className="text-sm font-medium text-white">Aucun compte connecté pour l';instant</p>
              <p className="mt-2 text-sm">Connectez vos comptes Vinted depuis la page de synchronisation pour alimenter votre dashboard multi-comptes.</p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-white/10 bg-[#111116] p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-white"><Layers3 className="h-4 w-4 text-violet-300" /> Indicateurs clés</div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <DetailCard title="Taux de conversion" value="7,9 %" description="Transformation sur les produits recommandés." />
            <DetailCard title="Revenu estimé" value="€14,200" description="Projection basée sur les tendances actuelles." />
            <DetailCard title="Alertes pro" value="Prioritaires" description="Alerte immédiate sur les comptes critiques." />
            <DetailCard title="Flux ratios" value="4.2x" description="Efficacité opérationnelle sur le dernier mois." />
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#111116] p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-white"><FileText className="h-4 w-4 text-violet-300" /> Rapports Business</div>
          <p className="mt-3 text-sm text-zinc-400">Publiez et partagez des rapports consolidés pour vos équipes.</p>
          <div className="mt-5 space-y-3">
            {['Performance mensuelle', 'Activité multi-comptes', 'Alertes stratégiques'].map((label) => (
              <div key={label} className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{label}</p>
                  <ArrowRight className="h-4 w-4 text-zinc-400" />
                </div>
                <p className="mt-2 text-xs text-zinc-500">Rapport exportable en PDF et Excel.</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#111116] p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
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
  return <div className="h-40 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
}
