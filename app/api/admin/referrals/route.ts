import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/prisma'
import { getCurrentUser, errorResponse } from '@/lib/access-control'

/**
 * Registre des commissions de parrainage, côté administration.
 *
 * Ce fichier ne déclenche aucun paiement et n'en est pas capable : il lit ce
 * que le webhook Stripe a enregistré et permet à l'exploitant de déclarer,
 * après coup, les virements qu'il a faits lui-même.
 */

/**
 * Formes locales des lignes lues en base.
 *
 * Déclarées ici, et volontairement en sous-ensemble des modèles Prisma, pour
 * que l'agrégation reste lisible et typée sans dépendre de l'inférence.
 */
interface LigneCommission {
  id: string
  referralId: string
  userId: string | null
  stripeInvoiceId: string
  montantEncaisse: number
  devise: string
  commissionPct: number
  montantDu: number
  statut: string
  payeLe: Date | null
  createdAt: Date
}

interface LigneDue {
  id: string
  montantDu: number
}

interface Totaux {
  totalDuCents: number
  totalPayeCents: number
  totalEncaisseCents: number
  totalAnnuleCents: number
}

interface LignePartenaire {
  id: string
  code: string
  jeton: string
  beneficiaire: string
  email: string | null
  commissionPct: number
  actif: boolean
  notes: string | null
  createdAt: Date
}

/** Même source d'URL publique que `lib/email.ts`, barre finale retirée pour ne
 *  pas produire un lien en `//?ref=`. */
function lienParrainage(code: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.resellq.com').replace(/\/+$/, '')
  return `${base}/?ref=${code}`
}

/** Le relevé que le partenaire consulte lui-même, sans compte ni mot de passe. */
function lienReleve(jeton: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.resellq.com').replace(/\/+$/, '')
  return `${base}/partenaire/${jeton}`
}

async function exigerAdmin(request: Request) {
  const user = await getCurrentUser(request)
  if (!user) return { reponse: errorResponse('Connexion requise.', 401) }
  if (user.role !== 'ADMIN') return { reponse: errorResponse('Accès administrateur requis.', 403) }
  return { user }
}

const codeSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  // Le code finit dans une URL puis dans un cookie : on le contraint à ce qui
  // traverse les deux sans encodage.
  .regex(/^[A-Za-z0-9_-]+$/, 'Le code ne peut contenir que des lettres, chiffres, tirets et tirets bas.')

const creationSchema = z.object({
  code: codeSchema,
  beneficiaire: z.string().trim().min(2).max(120),
  email: z.string().trim().email().optional().or(z.literal('')),
  commissionPct: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  actif: z.boolean().optional(),
})

const paiementSchema = z.object({
  referralId: z.string().trim().min(1).optional(),
  commissionIds: z.array(z.string().trim().min(1)).max(500).optional(),
})

export async function GET(request: Request) {
  const garde = await exigerAdmin(request)
  if ('reponse' in garde) return garde.reponse

  const [referrals, commissions, inscriptions, visites] = await Promise.all([
    prisma.referral.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.referralCommission.findMany({
      select: {
        id: true,
        referralId: true,
        userId: true,
        stripeInvoiceId: true,
        montantEncaisse: true,
        devise: true,
        commissionPct: true,
        montantDu: true,
        statut: true,
        payeLe: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    // Les inscriptions se comptent sur les comptes, pas sur les factures : un
    // filleul qui n'a jamais payé n'apparaît dans aucune commission.
    prisma.user.groupBy({
      by: ['referralCode'],
      where: { referralCode: { not: null } },
      _count: { _all: true },
    }),
    // Toléré absent : tant que docs/sql/2026-09-12-parrainage-visites.sql n'a
    // pas été appliqué, la table n'existe pas. Le registre des commissions,
    // lui, doit rester lisible — c'est le seul écran qui dise ce qui est dû.
    prisma.referralVisite
      .groupBy({ by: ['code'], _sum: { visiteurs: true } })
      .catch((erreur: unknown) => {
        console.error('[admin/referrals] visiteurs indisponibles:', erreur)
        return [] as { code: string; _sum: { visiteurs: number | null } }[]
      }),
  ])

  const visiteursParCode = new Map<string, number>()
  for (const ligne of visites) visiteursParCode.set(ligne.code, ligne._sum.visiteurs ?? 0)

  const inscriptionsParCode = new Map<string, number>()
  for (const ligne of inscriptions) {
    if (ligne.referralCode) inscriptionsParCode.set(ligne.referralCode, ligne._count._all)
  }

  const partenaires = referrals.map((referral: LignePartenaire) => {
    const lignes = commissions.filter((c: LigneCommission) => c.referralId === referral.id)
    const facturees = lignes.filter((c: LigneCommission) => c.statut !== 'annule')

    // « Clients payants » se mesure sur les factures réellement encaissées, pas
    // sur le statut d'abonnement : c'est le seul chiffre qui corresponde à de
    // l'argent reçu.
    const clientsPayants = new Set(
      facturees.map((c: LigneCommission) => c.userId).filter((id: string | null): id is string => Boolean(id)),
    ).size

    const somme = (source: LigneCommission[], champ: 'montantEncaisse' | 'montantDu') =>
      source.reduce((total: number, ligne: LigneCommission) => total + ligne[champ], 0)

    return {
      id: referral.id,
      code: referral.code,
      beneficiaire: referral.beneficiaire,
      email: referral.email,
      commissionPct: referral.commissionPct,
      actif: referral.actif,
      notes: referral.notes,
      createdAt: referral.createdAt,
      lien: lienParrainage(referral.code),
      lienReleve: lienReleve(referral.jeton),
      // Zéro visiteur avec des inscriptions n'est pas une contradiction : le
      // comptage n'existe que depuis sa mise en place, les inscriptions
      // d'avant lui sont antérieures.
      visiteurs: visiteursParCode.get(referral.code) ?? 0,
      inscriptions: inscriptionsParCode.get(referral.code) ?? 0,
      clientsPayants,
      nbFactures: facturees.length,
      // Tous les montants sont en centimes : la conversion en euros est faite
      // au dernier moment, à l'affichage, pour qu'aucun arrondi intermédiaire
      // n'invente ou n'efface de centimes.
      totalEncaisseCents: somme(facturees, 'montantEncaisse'),
      totalDuCents: somme(lignes.filter((c: LigneCommission) => c.statut === 'du'), 'montantDu'),
      totalPayeCents: somme(lignes.filter((c: LigneCommission) => c.statut === 'paye'), 'montantDu'),
      totalAnnuleCents: somme(lignes.filter((c: LigneCommission) => c.statut === 'annule'), 'montantDu'),
      dernieresCommissions: lignes.slice(0, 20),
    }
  })

  return NextResponse.json({
    partenaires,
    totaux: {
      totalDuCents: partenaires.reduce((t: number, p: Totaux) => t + p.totalDuCents, 0),
      totalPayeCents: partenaires.reduce((t: number, p: Totaux) => t + p.totalPayeCents, 0),
      totalEncaisseCents: partenaires.reduce((t: number, p: Totaux) => t + p.totalEncaisseCents, 0),
      totalAnnuleCents: partenaires.reduce((t: number, p: Totaux) => t + p.totalAnnuleCents, 0),
    },
  })
}

export async function POST(request: Request) {
  const garde = await exigerAdmin(request)
  if ('reponse' in garde) return garde.reponse

  const body = await request.json().catch(() => ({}))
  const parsed = creationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Données invalides.' }, { status: 400 })
  }

  const { beneficiaire, commissionPct, actif } = parsed.data
  // Toujours stocké en majuscules : le lien peut être recopié dans n'importe
  // quelle casse, l'attribution doit retomber sur la même ligne.
  const code = parsed.data.code.toUpperCase()
  const email = parsed.data.email ? parsed.data.email.toLowerCase() : null
  const notes = parsed.data.notes || null

  const referral = await prisma.referral.upsert({
    where: { code },
    create: {
      code,
      beneficiaire,
      email,
      notes,
      commissionPct: commissionPct ?? 30,
      actif: actif ?? true,
    },
    // Le taux déjà appliqué aux commissions passées n'est pas touché : chaque
    // ligne a gardé le sien. Une modification ne vaut que pour la suite.
    update: {
      beneficiaire,
      email,
      notes,
      ...(commissionPct === undefined ? {} : { commissionPct }),
      ...(actif === undefined ? {} : { actif }),
    },
  })

  return NextResponse.json({
    referral,
    lien: lienParrainage(referral.code),
  })
}

/**
 * Marque des commissions comme payées.
 *
 * C'est une déclaration a posteriori : le virement a été fait à la main, en
 * dehors de ResellQ, et l'exploitant vient l'inscrire au registre. Rien ici ne
 * transfère d'argent.
 */
export async function PATCH(request: Request) {
  const garde = await exigerAdmin(request)
  if ('reponse' in garde) return garde.reponse

  const body = await request.json().catch(() => ({}))
  const parsed = paiementSchema.safeParse(body)
  if (!parsed.success || (!parsed.data.referralId && !parsed.data.commissionIds?.length)) {
    return NextResponse.json({ error: 'Indiquez un partenaire ou des commissions à marquer payées.' }, { status: 400 })
  }

  const { referralId, commissionIds } = parsed.data

  // Seules les lignes encore dues sont concernées : repasser sur une ligne déjà
  // payée changerait la date d'un virement qui a eu lieu avant, et une ligne
  // annulée n'est plus due du tout.
  const cible = {
    statut: 'du',
    ...(referralId ? { referralId } : {}),
    ...(commissionIds?.length ? { id: { in: commissionIds } } : {}),
  }

  const concernees = await prisma.referralCommission.findMany({
    where: cible,
    select: { id: true, montantDu: true },
  })

  if (concernees.length === 0) {
    return NextResponse.json({ marquees: 0, montantCents: 0, message: 'Aucune commission en attente ne correspond.' })
  }

  await prisma.referralCommission.updateMany({
    where: { id: { in: concernees.map((c: LigneDue) => c.id) }, statut: 'du' },
    data: { statut: 'paye', payeLe: new Date() },
  })

  return NextResponse.json({
    marquees: concernees.length,
    montantCents: concernees.reduce((total: number, c: LigneDue) => total + c.montantDu, 0),
  })
}
