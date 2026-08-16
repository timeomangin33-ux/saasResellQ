'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, CreditCard, ExternalLink, Loader2, Sparkles } from 'lucide-react'

type Subscription = {
  subscriptionStatus: string
  subscriptionEnd?: string | null
  planName: string
  planPrice: number | null
  aiCreditsUsed: number
  aiCreditsIncluded: number
}

export default function DashboardBillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [openingPortal, setOpeningPortal] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/subscription/info').then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Impossible de charger votre abonnement.')
      setSubscription(data)
    }).catch(err => setError(err instanceof Error ? err.message : 'Erreur inconnue')).finally(() => setLoading(false))
  }, [])

  const openPortal = async () => {
    setOpeningPortal(true); setError('')
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnUrl: window.location.href }) })
      const data = await response.json()
      if (!response.ok || !data.url) throw new Error(data.error || 'Le portail de facturation est indisponible.')
      window.location.assign(data.url)
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur inconnue'); setOpeningPortal(false) }
  }

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-violet-300" /></div>
  const active = subscription?.subscriptionStatus === 'ACTIVE'
  const remaining = Math.max(0, (subscription?.aiCreditsIncluded || 0) - (subscription?.aiCreditsUsed || 0))

  return <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-8"><p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-300">Compte</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Abonnement et facturation</h1><p className="mt-2 text-sm text-zinc-400">Gérez votre forfait, vos paiements et votre consommation IA.</p>{error && <p className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
    <div className="mt-7 grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><section className="overflow-hidden rounded-[28px] border border-white/[.08] bg-[#111116]"><div className="bg-gradient-to-br from-violet-500/20 via-[#15151b] to-[#111116] p-6 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[.18em] text-violet-200">Forfait actuel</p><h2 className="mt-3 text-3xl font-semibold text-white">{active ? subscription?.planName : 'Aucun forfait actif'}</h2><p className="mt-2 text-sm text-zinc-400">{active && subscription?.planPrice ? `${subscription.planPrice} € / mois` : 'Choisissez l\'offre adaptée à votre activité.'}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${active ? 'bg-emerald-400/15 text-emerald-200' : 'bg-white/[.08] text-zinc-400'}`}>{active ? 'Actif' : 'Inactif'}</span></div></div><div className="p-6 sm:p-7"><div className="flex flex-col gap-4 border-b border-white/[.07] pb-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-white">Prochain renouvellement</p><p className="mt-1 text-sm text-zinc-500">{subscription?.subscriptionEnd ? new Date(subscription.subscriptionEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</p></div>{active ? <button onClick={openPortal} disabled={openingPortal} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-violet-100 disabled:opacity-60">{openingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}{openingPortal ? 'Ouverture...' : 'Gérer avec Stripe'} <ExternalLink className="h-3.5 w-3.5" /></button> : <Link href="/pricing" className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-950">Choisir un forfait</Link>}</div><p className="pt-5 text-xs leading-5 text-zinc-500">Les moyens de paiement, factures, changements de forfait et annulations sont gérés dans le portail sécurisé Stripe.</p></div></section>
      <section className="rounded-[28px] border border-violet-400/20 bg-violet-500/[.07] p-6"><div className="flex items-center gap-2 text-violet-200"><Sparkles className="h-4 w-4" /><p className="text-sm font-medium">Crédits IA ce cycle</p></div><p className="mt-6 text-4xl font-semibold text-white">{remaining.toLocaleString('fr-FR')}</p><p className="mt-1 text-sm text-zinc-400">sur {(subscription?.aiCreditsIncluded || 0).toLocaleString('fr-FR')} disponibles</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-300 to-fuchsia-300" style={{ width: `${subscription?.aiCreditsIncluded ? Math.max(0, Math.min(100, (remaining / subscription.aiCreditsIncluded) * 100)) : 0}%` }} /></div><div className="mt-6 flex gap-3 rounded-xl border border-white/[.08] bg-black/10 p-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /><p className="text-xs leading-5 text-zinc-400">La consommation est déduite côté serveur et se réinitialise avec votre cycle d\'abonnement.</p></div></section></div></div>
}
