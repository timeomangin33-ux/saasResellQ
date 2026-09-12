import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, HandCoins, Info, Link2, TrendingUp, UserPlus, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/ui/logo'
import { prisma } from '@/prisma'

/**
 * Ce qu'un partenaire voit de son propre parrainage.
 *
 * Jusqu'ici, ses chiffres n'existaient que sur /admin/parrainage, c'est-à-dire
 * nulle part pour lui : il devait demander, et croire la réponse. Un
 * partenariat rémunéré tenu par une page que seul celui qui paie peut lire
 * repose entièrement sur la confiance ; celui-ci se vérifie.
 *
 * L'accès se fait par un jeton dans l'URL, sans compte. Créer un compte pour
 * consulter un tableau de six nombres reviendrait à imposer un mot de passe
 * pour lire ce qui vous concerne — et à l'oublier.
 *
 * La page est en lecture seule et ne montre aucun filleul : ni nom, ni email,
 * ni date d'inscription individuelle. Un partenaire a le droit de savoir
 * combien de personnes il a amenées, pas qui elles sont.
 */

// Le jeton est un secret : rien de tout cela ne doit se retrouver dans un
// index de moteur de recherche, ni dans un cache partagé.
export const metadata: Metadata = {
  title: 'Votre parrainage — ResellQ',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

const euros = (centimes: number) =>
  (centimes / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

const leJour = (date: Date) =>
  date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

const LIBELLE_STATUT: Record<string, string> = {
  du: 'à verser',
  paye: 'versée',
  annule: 'annulée (remboursement)',
}

async function lireDossier(jeton: string) {
  // Un jeton est un uuid : tout ce qui n'en a pas la forme n'a aucune chance
  // d'exister en base, et n'a pas besoin d'y être cherché.
  if (!/^[0-9a-fA-F-]{10,64}$/.test(jeton)) return null

  const referral = await prisma.referral.findUnique({
    where: { jeton },
    select: {
      code: true,
      beneficiaire: true,
      commissionPct: true,
      actif: true,
      commissions: {
        select: {
          id: true,
          montantEncaisse: true,
          commissionPct: true,
          montantDu: true,
          statut: true,
          payeLe: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!referral) return null

  const [visites, inscriptions] = await Promise.all([
    prisma.referralVisite.findMany({
      where: { code: referral.code },
      select: { jour: true, visiteurs: true },
      orderBy: { jour: 'desc' },
    }),
    prisma.user.count({ where: { referralCode: referral.code } }),
  ])

  const facturees = referral.commissions.filter((c) => c.statut !== 'annule')
  const somme = (lignes: typeof referral.commissions) => lignes.reduce((t, c) => t + c.montantDu, 0)

  const ilYA30Jours = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  return {
    referral,
    inscriptions,
    visiteursTotal: visites.reduce((t, v) => t + v.visiteurs, 0),
    visiteurs30j: visites.filter((v) => v.jour >= ilYA30Jours).reduce((t, v) => t + v.visiteurs, 0),
    // Des factures, pas des clients : un abonné qui renouvelle trois mois
    // compte trois fois, parce que c'est trois fois qu'il vous a rapporté.
    facturesEncaissees: facturees.length,
    dueCents: somme(referral.commissions.filter((c) => c.statut === 'du')),
    payeCents: somme(referral.commissions.filter((c) => c.statut === 'paye')),
  }
}

function Chiffre({
  icone: Icone,
  valeur,
  libelle,
  precision,
}: {
  icone: typeof Users
  valeur: string
  libelle: string
  precision?: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-background/70 p-5">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        <Icone className="h-3.5 w-3.5 text-primary" />
        {libelle}
      </div>
      <div className="text-2xl font-semibold tracking-tight">{valeur}</div>
      {precision ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{precision}</p> : null}
    </div>
  )
}

export default async function PagePartenaire({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params

  // Une base sans la table des visites (tant que le SQL de
  // docs/sql/2026-09-12-parrainage-visites.sql n'est pas appliqué) doit donner
  // une page absente, pas une erreur serveur en pleine figure du partenaire.
  const dossier = await lireDossier(jeton).catch((erreur) => {
    console.error('[partenaire] dossier illisible:', erreur)
    return null
  })
  if (!dossier) notFound()

  const { referral, inscriptions, visiteursTotal, visiteurs30j, facturesEncaissees, dueCents, payeCents } = dossier
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.resellq.com').replace(/\/+$/, '')
  const lien = `${base}/?ref=${referral.code}`

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col px-6 py-8 sm:py-10">
        <div className="mb-8 flex items-center justify-between">
          <Logo size="md" />
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            ResellQ
          </Link>
        </div>

        <Card className="border-white/10 bg-card/80 backdrop-blur">
          <CardContent className="space-y-8 p-6 sm:p-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-primary">
                <HandCoins className="h-3.5 w-3.5" />
                Partenariat
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{referral.beneficiaire}</h1>
              <p className="text-sm leading-7 text-muted-foreground">
                Code <span className="font-mono text-foreground">{referral.code}</span> · commission de{' '}
                <span className="font-medium text-foreground">{referral.commissionPct} %</span> sur chaque facture
                encaissée.
                {!referral.actif && (
                  <span className="ml-1 text-amber-400">
                    Ce code est désactivé : les nouvelles inscriptions ne vous sont plus attribuées.
                  </span>
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-background/70 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Link2 className="h-4 w-4 text-primary" />
                Votre lien
              </div>
              <p className="break-all font-mono text-sm text-foreground">{lien}</p>
              <p className="mt-3 text-xs leading-6 text-muted-foreground">
                Toute inscription faite dans les 60 jours suivant un clic sur ce lien vous est attribuée. La casse n'a
                pas d'importance : le lien recopié en minuscules fonctionne aussi.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Chiffre
                icone={Users}
                libelle="Visiteurs"
                valeur={visiteursTotal.toLocaleString('fr-FR')}
                precision={`dont ${visiteurs30j.toLocaleString('fr-FR')} sur les 30 derniers jours`}
              />
              <Chiffre
                icone={UserPlus}
                libelle="Inscriptions"
                valeur={inscriptions.toLocaleString('fr-FR')}
                precision="comptes créés et rattachés à votre code"
              />
              <Chiffre
                icone={TrendingUp}
                libelle="Factures"
                valeur={facturesEncaissees.toLocaleString('fr-FR')}
                precision="abonnements réellement encaissés"
              />
              <Chiffre
                icone={HandCoins}
                libelle="À vous verser"
                valeur={euros(dueCents)}
                precision={payeCents > 0 ? `${euros(payeCents)} déjà versés` : 'aucun versement pour l’instant'}
              />
            </div>

            <div className="flex gap-3 rounded-2xl border border-white/10 bg-background/70 p-5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs leading-6 text-muted-foreground">
                Cette page est un relevé, pas un outil de paiement : ResellQ n'envoie pas d'argent depuis ici. Les
                virements sont faits à la main, en dehors du site, et viennent ensuite s'inscrire ci-dessous comme
                « versée ». Les montants sont calculés sur ce que Stripe a réellement encaissé, remises déduites ; une
                facture remboursée annule la commission correspondante.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight">Détail des commissions</h2>
              {referral.commissions.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-background/70 p-5 text-sm leading-7 text-muted-foreground">
                  {visiteursTotal === 0
                    ? "Personne n'est encore passé par votre lien. Dès le premier visiteur, le compteur ci-dessus bouge — c'est le moyen de vérifier que votre lien est bien celui que vous avez publié."
                    : "Des visiteurs sont passés, aucun abonnement n'a encore été facturé. Les commissions apparaîtront ici au fil des factures."}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-background/70">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      <tr className="border-b border-white/10">
                        <th className="p-4 font-medium">Date</th>
                        <th className="p-4 font-medium">Encaissé</th>
                        <th className="p-4 font-medium">Taux</th>
                        <th className="p-4 font-medium">Pour vous</th>
                        <th className="p-4 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referral.commissions.map((commission) => (
                        <tr key={commission.id} className="border-b border-white/5 last:border-0">
                          <td className="p-4 text-muted-foreground">{leJour(commission.createdAt)}</td>
                          <td className="p-4">{euros(commission.montantEncaisse)}</td>
                          <td className="p-4 text-muted-foreground">{commission.commissionPct} %</td>
                          <td className="p-4 font-medium">{euros(commission.montantDu)}</td>
                          <td className="p-4 text-muted-foreground">
                            {LIBELLE_STATUT[commission.statut] ?? commission.statut}
                            {commission.payeLe ? ` le ${leJour(commission.payeLe)}` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
