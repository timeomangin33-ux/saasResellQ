import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../../../../prisma'
import { nextMonthlyReset } from '@/lib/plans'
import { checkRateLimit } from '@/lib/rate-limit'
// Email verification temporarily disabled: do not send emails

// Même nom que celui posé par le middleware au clic sur ?ref=CODE.
const COOKIE_PARRAINAGE = 'resellq_ref'

/**
 * Lit un cookie sur la requête brute.
 *
 * Écrit à la main parce que ce handler reçoit un `Request` standard, pas un
 * `NextRequest` : il n'a pas de `.cookies`.
 */
function lireCookie(request: Request, nom: string) {
  const entete = request.headers.get('cookie')
  if (!entete) return null

  for (const morceau of entete.split(';')) {
    const separateur = morceau.indexOf('=')
    if (separateur <= 0) continue
    if (morceau.slice(0, separateur).trim() !== nom) continue
    return decodeURIComponent(morceau.slice(separateur + 1).trim())
  }

  return null
}

/**
 * Retrouve le partenaire à créditer pour cette inscription, ou null.
 *
 * Ne lève jamais : un parrainage raté ne doit pas empêcher quelqu'un de créer
 * son compte. Perdre une commission est réparable à la main, perdre un client
 * ne l'est pas.
 */
async function resoudreParrainage(request: Request, emailInscrit: string) {
  const code = lireCookie(request, COOKIE_PARRAINAGE)?.trim()
  if (!code) return null

  try {
    const referral = await prisma.referral.findFirst({
      // Insensible à la casse : un partenaire qui recopie son lien en
      // minuscules dans une bio Instagram doit quand même être crédité.
      where: { code: { equals: code, mode: 'insensitive' }, actif: true },
      select: { code: true, email: true },
    })

    if (!referral) return null

    // Auto-parrainage : un partenaire qui s'abonne par son propre lien se
    // ferait verser une commission sur son propre abonnement, c'est-à-dire une
    // remise que personne n'a décidée. On ignore l'attribution, l'inscription
    // se poursuit normalement.
    if (referral.email && referral.email.trim().toLowerCase() === emailInscrit) return null

    return referral.code
  } catch (error) {
    console.error('[auth/register] parrainage ignoré:', error)
    return null
  }
}

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
})

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
    const rateLimit = checkRateLimit(`register:${ip}`, 5, 60_000)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Trop de tentatives, réessayez plus tard.' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    const { name, password } = parsed.data
    const normalizedEmail = parsed.data.email.trim().toLowerCase()

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existingUser) {
      return NextResponse.json({ error: 'Un compte existe déjà avec cet email' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const codeParrainage = await resoudreParrainage(request, normalizedEmail)

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: 'USER',
        subscriptionStatus: 'INACTIVE',
        subscriptionPlan: 'FREE',
        aiCreditsResetAt: nextMonthlyReset(),
        // mark as verified until email flow is re-enabled
        emailVerifiedAt: new Date(),
        // Figé ici et jamais recalculé : le partenaire crédité est celui qui a
        // amené le compte, même si le client s'abonne des mois plus tard.
        referralCode: codeParrainage,
        referredAt: codeParrainage ? new Date() : null,
      },
    })
    return NextResponse.json({ success: true, message: 'Compte créé.' }, { status: 201 })
  } catch (error) {
    console.error('[auth/register] failed:', error)
    return NextResponse.json({
      error: 'Le serveur d’authentification n’est pas correctement configuré. Vérifiez DATABASE_URL et NEXTAUTH_SECRET.',
    }, { status: 500 })
  }
}
