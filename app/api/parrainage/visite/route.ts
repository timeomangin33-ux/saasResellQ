import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * Enregistre qu'un lien de parrainage a amené quelqu'un.
 *
 * Appelée par le middleware, qui voit passer `?ref=CODE` mais tourne sur l'Edge
 * et n'a donc aucun accès à la base. C'est la seule raison d'être de cette
 * route : traduire ce que le middleware a vu en une écriture Postgres.
 *
 * Elle n'est protégée par aucun secret, et c'est délibéré. Le seul pouvoir
 * qu'elle donne est d'incrémenter le compteur d'un code déjà existant et
 * actif — ce que n'importe qui peut déjà faire en ouvrant le lien plusieurs
 * fois. Un secret d'environnement de plus serait une variable oubliée le jour
 * d'un déploiement, donc un compteur muet sans qu'on sache pourquoi.
 *
 * Ce qu'elle n'écrit pas : ni adresse IP, ni identifiant de navigateur, ni
 * page d'arrivée. Le registre ne contient que « ce code, ce jour, ce nombre ».
 */

// Prisma ne tourne pas sur l'Edge, et cette route n'a de sens qu'avec lui.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Minuit UTC du jour en cours : toutes les visites d'un jour sur une ligne. */
function jourCourant() {
  const maintenant = new Date()
  return new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate()))
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  // Large : une classe entière derrière un même NAT (un lycée, un opérateur
  // mobile) peut légitimement ouvrir le lien d'un partenaire en rafale après
  // une vidéo. La limite n'est là que contre le martèlement automatisé.
  if (!checkRateLimit(`parrainage-visite:${ip}`, 60, 60_000).allowed) {
    return NextResponse.json({ ok: false }, { status: 429 })
  }

  const corps = await request.json().catch(() => ({}))
  const brut = typeof corps?.code === 'string' ? corps.code.trim().toUpperCase() : ''
  if (!/^[A-Z0-9_-]{2,40}$/.test(brut)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // `essai` répond « ce code est-il connu ici ? » sans rien incrémenter.
  // C'est ce qui permet à `npm run parrainage:verifier` d'éprouver la chaîne
  // entière contre la vraie production, sans base de données et sans ajouter
  // au relevé du partenaire un visiteur qui n'existe pas.
  const essai = corps?.essai === true

  try {
    // On ne compte que pour un code qui existe et qui est actif : sinon la
    // table se remplirait de codes inventés par n'importe quel visiteur, et la
    // clé étrangère refuserait l'écriture de toute façon.
    const referral = await prisma.referral.findFirst({
      where: { code: { equals: brut, mode: 'insensitive' }, actif: true },
      select: { code: true },
    })
    if (!referral) return NextResponse.json({ ok: true, connu: false, compte: false })
    if (essai) return NextResponse.json({ ok: true, connu: true, compte: false })

    await prisma.referralVisite.upsert({
      where: { code_jour: { code: referral.code, jour: jourCourant() } },
      create: { code: referral.code, jour: jourCourant(), visiteurs: 1 },
      update: { visiteurs: { increment: 1 } },
    })

    return NextResponse.json({ ok: true, connu: true, compte: true })
  } catch (error) {
    // Un compteur perdu ne doit jamais peser sur une visite. Le cas attendu
    // est la table absente, tant que docs/sql/2026-09-12-parrainage-visites.sql
    // n'a pas été appliqué.
    console.error('[parrainage/visite] visite non comptée:', error)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
