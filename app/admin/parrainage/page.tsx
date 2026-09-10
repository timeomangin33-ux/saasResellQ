'use client'

/**
 * Registre des partenaires et de ce qui leur est dû.
 *
 * Cette page n'est qu'un livre de comptes : ResellQ n'envoie jamais d'argent
 * aux partenaires. Le bandeau en haut le dit à l'utilisateur, parce qu'un
 * tableau de commissions ressemble à un outil de paiement et qu'il ne faut pas
 * qu'on croie un virement parti alors qu'il ne l'est pas.
 */

import { useEffect, useState } from 'react'
import DashboardLayout from '@/app/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { SpotlightCard } from '@/components/ui/spotlight-card'
import { HandCoins, Loader2, Info } from 'lucide-react'
import Link from 'next/link'

interface Commission {
  id: string
  stripeInvoiceId: string
  montantEncaisse: number
  devise: string
  commissionPct: number
  montantDu: number
  statut: string
  payeLe: string | null
  createdAt: string
}

interface Partenaire {
  id: string
  code: string
  beneficiaire: string
  email: string | null
  commissionPct: number
  actif: boolean
  notes: string | null
  lien: string
  inscriptions: number
  clientsPayants: number
  nbFactures: number
  totalEncaisseCents: number
  totalDuCents: number
  totalPayeCents: number
  totalAnnuleCents: number
  dernieresCommissions: Commission[]
}

interface Reponse {
  partenaires: Partenaire[]
  totaux: {
    totalDuCents: number
    totalPayeCents: number
    totalEncaisseCents: number
    totalAnnuleCents: number
  }
}

/**
 * Centimes -> euros. Deux décimales toujours affichées : arrondir à l'euro
 * ferait apparaître des montants qui ne sont pas ceux qui seront virés.
 */
function euros(centimes: number) {
  return (centimes / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
}

const STATUTS: Record<string, string> = { du: 'Dû', paye: 'Payé', annule: 'Annulé' }

export default function ParrainagePage() {
  const [donnees, setDonnees] = useState<Reponse | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [detail, setDetail] = useState<string | null>(null)

  const [code, setCode] = useState('')
  const [beneficiaire, setBeneficiaire] = useState('')
  const [email, setEmail] = useState('')
  const [taux, setTaux] = useState('30')

  // Chargement initial écrit comme dans app/admin/page.tsx : la mise à jour
  // d'état se fait dans une continuation de la promesse et jamais dans le corps
  // de l'effet, qui déclencherait un rendu en cascade.
  useEffect(() => {
    fetch('/api/admin/referrals')
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Impossible de charger le parrainage.')
        return data as Reponse
      })
      .then(setDonnees)
      .catch((e) => setErreur(e instanceof Error ? e.message : 'Erreur inconnue.'))
      .finally(() => setChargement(false))
  }, [])

  // Relecture après une action de l'utilisateur : les chiffres affichés doivent
  // venir de la base, jamais d'un calcul local qui devinerait le résultat.
  async function recharger() {
    try {
      const res = await fetch('/api/admin/referrals')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Impossible de charger le parrainage.')
      setDonnees(data)
      setErreur(null)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur inconnue.')
    }
  }

  async function creer(event: React.FormEvent) {
    event.preventDefault()
    setEnCours(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          beneficiaire,
          email: email || undefined,
          commissionPct: taux === '' ? undefined : Number(taux),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Création impossible.')
      setMessage(`Code enregistré. Lien à partager : ${data.lien}`)
      setCode('')
      setBeneficiaire('')
      setEmail('')
      await recharger()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Erreur inconnue.')
    } finally {
      setEnCours(false)
    }
  }

  async function marquerPaye(partenaire: Partenaire) {
    const confirme = window.confirm(
      `Confirmez-vous avoir déjà viré ${euros(partenaire.totalDuCents)} à ${partenaire.beneficiaire} ?\n\n` +
        `ResellQ n'envoie aucun argent : cette action ne fait qu'inscrire au registre un virement que vous avez fait vous-même.`,
    )
    if (!confirme) return

    setEnCours(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralId: partenaire.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Mise à jour impossible.')
      setMessage(
        data.marquees > 0
          ? `${data.marquees} commission(s) marquée(s) comme payées, soit ${euros(data.montantCents)}.`
          : data.message || 'Aucune commission en attente.',
      )
      await recharger()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Erreur inconnue.')
    } finally {
      setEnCours(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl">
          <PageHeader
            title="Parrainage"
            kicker="Administration"
            icon={HandCoins}
            description="Partenaires, filleuls et commissions dues — calculées sur les factures réellement encaissées"
            actions={
              <Link href="/admin" className="chip border-border/50">
                Retour à l&apos;admin
              </Link>
            }
          />

          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
            <Info className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              <strong>ResellQ enregistre ce qui est dû, et ne paie rien automatiquement.</strong> Aucun virement n&apos;est
              déclenché depuis cette page. Vous payez vos partenaires à la main, par vos propres moyens, puis vous venez
              ici marquer les commissions comme payées pour garder le registre à jour.
            </p>
          </div>

          {chargement && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {!chargement && erreur && <div className="panel p-6 text-sm text-red-400">{erreur}</div>}

          {!chargement && donnees && (
            <>
              <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <SpotlightCard spotlightColor="rgba(16,185,129,0.14)" className="panel p-6">
                  <p className="mb-2 text-sm text-muted-foreground">Reste à payer</p>
                  <p className="stat-value">{euros(donnees.totaux.totalDuCents)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Commissions au statut « dû »</p>
                </SpotlightCard>
                <SpotlightCard spotlightColor="rgba(16,185,129,0.14)" className="panel p-6">
                  <p className="mb-2 text-sm text-muted-foreground">Déjà payé</p>
                  <p className="stat-value">{euros(donnees.totaux.totalPayeCents)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Virements que vous avez déclarés</p>
                </SpotlightCard>
                <SpotlightCard spotlightColor="rgba(16,185,129,0.14)" className="panel p-6">
                  <p className="mb-2 text-sm text-muted-foreground">Encaissé via parrainage</p>
                  <p className="stat-value">{euros(donnees.totaux.totalEncaisseCents)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Somme des factures Stripe payées</p>
                </SpotlightCard>
                <SpotlightCard spotlightColor="rgba(16,185,129,0.14)" className="panel p-6">
                  <p className="mb-2 text-sm text-muted-foreground">Annulé (remboursements)</p>
                  <p className="stat-value">{euros(donnees.totaux.totalAnnuleCents)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Argent rendu au client, donc non dû</p>
                </SpotlightCard>
              </div>

              <Reveal className="mb-8 panel p-8">
                <h2 className="mb-6 text-2xl font-bold">Partenaires</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="px-3 py-3 text-left font-semibold">Code</th>
                        <th className="px-3 py-3 text-left font-semibold">Bénéficiaire</th>
                        <th className="px-3 py-3 text-right font-semibold">Taux</th>
                        <th className="px-3 py-3 text-right font-semibold">Inscrits</th>
                        <th className="px-3 py-3 text-right font-semibold">Clients payants</th>
                        <th className="px-3 py-3 text-right font-semibold">Encaissé</th>
                        <th className="px-3 py-3 text-right font-semibold">Dû</th>
                        <th className="px-3 py-3 text-right font-semibold">Payé</th>
                        <th className="px-3 py-3 text-right font-semibold">Annulé</th>
                        <th className="px-3 py-3 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {donnees.partenaires.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                            Aucun partenaire pour l&apos;instant.
                          </td>
                        </tr>
                      ) : (
                        donnees.partenaires.map((p) => (
                          <tr key={p.id} className="border-b border-border/50 transition hover:bg-muted/30">
                            <td className="px-3 py-3">
                              <span className="font-mono font-semibold">{p.code}</span>
                              {!p.actif && (
                                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                  INACTIF
                                </span>
                              )}
                              <div className="text-[11px] text-muted-foreground">{p.lien}</div>
                            </td>
                            <td className="px-3 py-3">
                              {p.beneficiaire}
                              {p.email && <div className="text-[11px] text-muted-foreground">{p.email}</div>}
                            </td>
                            <td className="px-3 py-3 text-right">{p.commissionPct} %</td>
                            <td className="px-3 py-3 text-right">{p.inscriptions}</td>
                            <td className="px-3 py-3 text-right">{p.clientsPayants}</td>
                            <td className="px-3 py-3 text-right">{euros(p.totalEncaisseCents)}</td>
                            <td className="px-3 py-3 text-right font-bold text-accent">{euros(p.totalDuCents)}</td>
                            <td className="px-3 py-3 text-right text-muted-foreground">{euros(p.totalPayeCents)}</td>
                            <td className="px-3 py-3 text-right text-muted-foreground">{euros(p.totalAnnuleCents)}</td>
                            <td className="px-3 py-3 text-right">
                              <div className="flex flex-col items-end gap-1">
                                <button
                                  type="button"
                                  disabled={enCours || p.totalDuCents === 0}
                                  onClick={() => marquerPaye(p)}
                                  className="rounded-lg border border-border/50 px-3 py-1.5 text-xs font-semibold transition hover:border-emerald-400/30 hover:bg-muted/50 disabled:opacity-40"
                                >
                                  J&apos;ai viré ce montant
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDetail(detail === p.id ? null : p.id)}
                                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                                >
                                  {detail === p.id ? 'Masquer' : `Détail (${p.nbFactures})`}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {detail && (
                  <div className="mt-6 rounded-2xl border border-border/50 p-4">
                    <h3 className="mb-3 font-semibold">
                      Dernières factures — {donnees.partenaires.find((p) => p.id === detail)?.code}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/50 text-muted-foreground">
                            <th className="px-2 py-2 text-left">Date</th>
                            <th className="px-2 py-2 text-left">Facture Stripe</th>
                            <th className="px-2 py-2 text-right">Encaissé</th>
                            <th className="px-2 py-2 text-right">Taux</th>
                            <th className="px-2 py-2 text-right">Commission</th>
                            <th className="px-2 py-2 text-left">Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(donnees.partenaires.find((p) => p.id === detail)?.dernieresCommissions ?? []).map((c) => (
                            <tr key={c.id} className="border-b border-border/50">
                              <td className="px-2 py-2">{new Date(c.createdAt).toLocaleDateString('fr-FR')}</td>
                              <td className="px-2 py-2 font-mono">{c.stripeInvoiceId}</td>
                              <td className="px-2 py-2 text-right">{euros(c.montantEncaisse)}</td>
                              <td className="px-2 py-2 text-right">{c.commissionPct} %</td>
                              <td className="px-2 py-2 text-right font-semibold">{euros(c.montantDu)}</td>
                              <td className="px-2 py-2">
                                {STATUTS[c.statut] ?? c.statut}
                                {c.payeLe && ` le ${new Date(c.payeLe).toLocaleDateString('fr-FR')}`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Reveal>

              <Reveal className="panel p-8">
                <h2 className="mb-2 text-2xl font-bold">Nouveau code</h2>
                <p className="mb-6 text-sm text-muted-foreground">
                  Un code déjà existant est mis à jour. Le nouveau taux ne s&apos;applique qu&apos;aux futures factures :
                  les commissions déjà enregistrées gardent celui qui était en vigueur.
                </p>
                <form onSubmit={creer} className="grid gap-4 md:grid-cols-4">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    placeholder="VINCENT"
                    className="rounded-xl border border-border/50 bg-background px-4 py-2.5 font-mono uppercase"
                  />
                  <input
                    value={beneficiaire}
                    onChange={(e) => setBeneficiaire(e.target.value)}
                    required
                    placeholder="Vincent Dupont"
                    className="rounded-xl border border-border/50 bg-background px-4 py-2.5"
                  />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="vincent@exemple.fr (optionnel)"
                    className="rounded-xl border border-border/50 bg-background px-4 py-2.5"
                  />
                  <div className="flex gap-3">
                    <input
                      value={taux}
                      onChange={(e) => setTaux(e.target.value)}
                      type="number"
                      min={0}
                      max={100}
                      step="0.5"
                      className="w-24 rounded-xl border border-border/50 bg-background px-4 py-2.5"
                    />
                    <button
                      type="submit"
                      disabled={enCours}
                      className="flex-1 rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
                    >
                      Enregistrer
                    </button>
                  </div>
                </form>
                {message && <p className="mt-4 break-all text-sm text-muted-foreground">{message}</p>}
              </Reveal>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
