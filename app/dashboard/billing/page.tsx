'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle2, CreditCard, Download, ExternalLink, FileText, Loader2, Receipt, Sparkles } from 'lucide-react'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { Magnetic } from '@/components/ui/magnetic'
import { NumberTicker } from '@/components/ui/number-ticker'

type Subscription = {
  subscriptionStatus: string
  subscriptionEnd?: string | null
  cancelAtPeriodEnd: boolean
  planName: string
  planPrice: number | null
  planFeatures: string[]
  aiCreditsUsed: number
  aiCreditsIncluded: number
  paymentMethod: { brand: string; last4: string; expMonth: number; expYear: number } | null
}

type Invoice = {
  id: string
  number: string | null
  status: string | null
  amountPaid: number
  currency: string
  created: string
  hostedInvoiceUrl: string | null
  invoicePdf: string | null
}

const CARD_BRAND_LABELS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  diners: 'Diners Club',
  jcb: 'JCB',
  unionpay: 'UnionPay',
}

const INVOICE_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  paid: { label: 'Payée', className: 'bg-emerald-500/10 text-emerald-300' },
  open: { label: 'En attente', className: 'bg-amber-500/10 text-amber-300' },
  void: { label: 'Annulée', className: 'bg-zinc-500/10 text-zinc-400' },
  uncollectible: { label: 'Impayée', className: 'bg-red-500/10 text-red-300' },
  draft: { label: 'Brouillon', className: 'bg-zinc-500/10 text-zinc-400' },
}

export default function DashboardBillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [invoicesLoading, setInvoicesLoading] = useState(true)
  const [openingPortal, setOpeningPortal] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/subscription/info').then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Impossible de charger votre abonnement.')
      setSubscription(data)
    }).catch(err => setError(err instanceof Error ? err.message : 'Erreur inconnue')).finally(() => setLoading(false))

    fetch('/api/stripe/invoices').then(async response => {
      const data = await response.json()
      setInvoices(data.invoices ?? [])
    }).catch(() => setInvoices([])).finally(() => setInvoicesLoading(false))
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

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-300" /></div>

  const active = subscription?.subscriptionStatus === 'ACTIVE'
  const remaining = Math.max(0, (subscription?.aiCreditsIncluded || 0) - (subscription?.aiCreditsUsed || 0))
  const usagePct = subscription?.aiCreditsIncluded ? Math.max(0, Math.min(100, (remaining / subscription.aiCreditsIncluded) * 100)) : 0

  return (
    <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <p className="kicker">Compte</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Abonnement et facturation</h1>
        <p className="mt-2 text-sm text-zinc-400">Gérez votre forfait, vos moyens de paiement et vos factures.</p>
        {error && <p className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
      </motion.div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <SpotlightCard spotlightColor="rgba(16,185,129,0.12)">
          <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }} className="panel-strong overflow-hidden">
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/20 via-[#0f1310] to-[#0d0f0e] p-6 sm:p-7">
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-emerald-500/20 blur-[80px]"
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.85, 0.5] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[.18em] text-emerald-200">Forfait actuel</p>
                  <h2 className="mt-3 text-3xl font-semibold text-white">{active ? subscription?.planName : 'Aucun forfait actif'}</h2>
                  <p className="mt-2 text-sm text-zinc-400">{active && subscription?.planPrice ? `${subscription.planPrice} € / mois` : "Choisissez l'offre adaptée à votre activité."}</p>
                </div>
                <span className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${active ? 'bg-emerald-400/15 text-emerald-200' : 'bg-white/[.08] text-zinc-400'}`}>
                  {active ? (subscription?.cancelAtPeriodEnd ? 'Résiliation prévue' : 'Actif') : 'Inactif'}
                </span>
              </div>
              {active && subscription && subscription.planFeatures.length > 0 && (
                <ul className="relative mt-6 grid gap-2 sm:grid-cols-2">
                  {subscription.planFeatures.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-zinc-300">
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-300" />
                      {feature}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-6 sm:p-7">
              <div className="flex flex-col gap-4 border-b border-white/[.07] pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{subscription?.cancelAtPeriodEnd ? 'Accès jusqu\'au' : 'Prochain renouvellement'}</p>
                  <p className="mt-1 text-sm text-zinc-500">{subscription?.subscriptionEnd ? new Date(subscription.subscriptionEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {active ? (
                    <Magnetic strength={0.15}>
                      <button onClick={openPortal} disabled={openingPortal} className="btn-shine inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-60">
                        {openingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                        {openingPortal ? 'Ouverture...' : 'Gérer avec Stripe'} <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </Magnetic>
                  ) : (
                    <Magnetic strength={0.15}>
                      <Link href="/pricing" className="btn-shine inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-3 text-sm font-semibold text-white">Choisir un forfait</Link>
                    </Magnetic>
                  )}
                  {active && (
                    <Magnetic strength={0.15}>
                      <Link href="/pricing" className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[.08]">Changer de forfait</Link>
                    </Magnetic>
                  )}
                </div>
              </div>
              <p className="pt-5 text-xs leading-5 text-zinc-500">Les moyens de paiement, factures, changements de forfait et annulations sont gérés dans le portail sécurisé Stripe.</p>
            </div>
          </motion.section>
        </SpotlightCard>

        <div className="flex flex-col gap-5">
          <SpotlightCard spotlightColor="rgba(16,185,129,0.1)">
            <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08 }} className="panel-strong border-emerald-400/20 bg-emerald-500/[.05] p-6">
              <div className="flex items-center gap-2 text-emerald-200"><Sparkles className="h-4 w-4" /><p className="text-sm font-medium">Crédits IA ce cycle</p></div>
              <p className="mt-6 text-4xl font-semibold text-white"><NumberTicker value={remaining} /></p>
              <p className="mt-1 text-sm text-zinc-400">sur {(subscription?.aiCreditsIncluded || 0).toLocaleString('fr-FR')} disponibles</p>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div initial={{ width: 0 }} animate={{ width: `${usagePct}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300" />
              </div>
              <div className="mt-6 flex gap-3 rounded-xl border border-white/[.08] bg-black/10 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <p className="text-xs leading-5 text-zinc-400">La consommation est déduite côté serveur et se réinitialise avec votre cycle d'abonnement.</p>
              </div>
            </motion.section>
          </SpotlightCard>

          <SpotlightCard spotlightColor="rgba(16,185,129,0.1)">
            <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.11 }} className="panel-strong p-6">
              <div className="flex items-center gap-2 text-zinc-300"><CreditCard className="h-4 w-4" /><p className="text-sm font-medium">Moyen de paiement</p></div>
              {subscription?.paymentMethod ? (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[.08] bg-white/[.03] p-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{CARD_BRAND_LABELS[subscription.paymentMethod.brand] ?? subscription.paymentMethod.brand} •••• {subscription.paymentMethod.last4}</p>
                    <p className="mt-1 text-xs text-zinc-500">Expire {String(subscription.paymentMethod.expMonth).padStart(2, '0')}/{subscription.paymentMethod.expYear}</p>
                  </div>
                  <CreditCard className="h-6 w-6 text-zinc-500" />
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[.02] p-4 text-sm text-zinc-500">
                  Aucun moyen de paiement enregistré{active ? ' — gérez-le via le portail Stripe.' : '.'}
                </div>
              )}
            </motion.section>
          </SpotlightCard>
        </div>
      </div>

      <SpotlightCard spotlightColor="rgba(16,185,129,0.1)" className="mt-5">
        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.14 }} className="panel-strong overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/[.07] p-6">
            <Receipt className="h-4 w-4 text-zinc-300" />
            <p className="text-sm font-medium text-white">Historique des factures</p>
          </div>
          {invoicesLoading ? (
            <div className="flex items-center justify-center py-10 text-zinc-500"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : invoices.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              <FileText className="mx-auto mb-3 h-6 w-6 text-zinc-600" />
              Aucune facture pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[.06] text-left text-xs uppercase tracking-[.18em] text-zinc-500">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-3 py-3">Numéro</th>
                    <th className="px-3 py-3">Montant</th>
                    <th className="px-3 py-3">Statut</th>
                    <th className="px-6 py-3 text-right">Facture</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[.05]">
                  {invoices.map((invoice) => {
                    const statusInfo = invoice.status ? INVOICE_STATUS_LABELS[invoice.status] ?? { label: invoice.status, className: 'bg-zinc-500/10 text-zinc-400' } : null
                    return (
                      <tr key={invoice.id} className="transition-colors hover:bg-white/[.02]">
                        <td className="px-6 py-3.5 text-zinc-300">{new Date(invoice.created).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="px-3 py-3.5 text-zinc-500">{invoice.number ?? '—'}</td>
                        <td className="px-3 py-3.5 font-medium text-white">{(invoice.amountPaid / 100).toLocaleString('fr-FR', { style: 'currency', currency: invoice.currency.toUpperCase() })}</td>
                        <td className="px-3 py-3.5">
                          {statusInfo && <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.className}`}>{statusInfo.label}</span>}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          {invoice.invoicePdf && (
                            <a href={invoice.invoicePdf} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 transition hover:text-emerald-300">
                              <Download className="h-3.5 w-3.5" /> PDF
                            </a>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>
      </SpotlightCard>
    </div>
  )
}
