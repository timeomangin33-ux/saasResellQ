import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/prisma'
import { consumeAICredits } from '@/lib/ai-credits'
import { normalizePlan } from '@/lib/plans'

const PLAN_RANK = { FREE: 0, STARTER: 1, PRO: 2, BUSINESS: 3 } as const

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>

export type AuthorizedFeatureResult =
  | { user: CurrentUser }
  | { response: ReturnType<typeof NextResponse.json> }

export type AuthorizedAIFeatureResult =
  | { user: CurrentUser; usage: { remaining: number; limit: number } }
  | { response: ReturnType<typeof NextResponse.json> }

export async function getCurrentUser(_request?: Request) {
  const session = await auth()
  if (!session?.user?.id) return null
  return prisma.user.findUnique({ where: { id: session.user.id } })
}

export function errorResponse(message: string, status = 403) {
  return NextResponse.json({ error: message }, { status })
}

export function requireInternalAccess(request: Request) {
  const provided =
    request.headers.get('x-internal-secret') ||
    request.headers.get('x-api-key') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()

  const expected = process.env.INTERNAL_API_SECRET || process.env.NEXTAUTH_SECRET

  if (!expected) {
    return { response: errorResponse('Configuration interne manquante.', 500) }
  }

  if (!provided || provided !== expected) {
    return { response: errorResponse('Accès interne non autorisé.', 401) }
  }

  return { ok: true }
}

export function hasMinimumPlan(plan: string, minimum: keyof typeof PLAN_RANK) {
  return (PLAN_RANK[normalizePlan(plan)] ?? 0) >= PLAN_RANK[minimum]
}

export async function authorizeFeature(request: Request, minimum: keyof typeof PLAN_RANK = 'STARTER'): Promise<AuthorizedFeatureResult> {
  const user = await getCurrentUser(request)
  if (!user) return { response: errorResponse('Connexion requise.', 401) }
  if (user.role !== 'ADMIN') {
    if (user.subscriptionStatus !== 'ACTIVE') {
      return { response: errorResponse('Un abonnement actif est requis.', 402) }
    }
    // Check subscription end date if present
    if (user.subscriptionEnd && new Date(user.subscriptionEnd) < new Date()) {
      return { response: errorResponse('Votre abonnement a expiré.', 402) }
    }
  }
  if (user.role !== 'ADMIN' && !hasMinimumPlan(user.subscriptionPlan, minimum)) {
    return { response: errorResponse(`Cette fonctionnalité est réservée au forfait ${minimum}.`, 403) }
  }
  return { user }
}

export async function authorizeAuthenticatedUser(request?: Request): Promise<AuthorizedFeatureResult> {
  const user = await getCurrentUser(request)
  if (!user) return { response: errorResponse('Connexion requise.', 401) }
  return { user }
}

/**
 * Rembourse des crédits IA déjà débités.
 *
 * `authorizeAIFeature` débite AVANT que l'agent ne soit contacté, et
 * `callAgent` ne lève jamais : quand N8N_WEBHOOK_BASE_URL n'est pas
 * configurée — c'est le cas de ce déploiement — il rend un repli. Le quota
 * mensuel de l'utilisateur était donc consommé pour une réponse qu'aucun
 * agent n'a produite. Les routes IA appellent cette fonction sur le chemin
 * d'échec, juste avant de répondre 503.
 */
export async function rembourserCredits(userId: string, montant = 1, action = 'remboursement') {
  if (!userId || montant <= 0) return
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, aiCreditsUsed: true },
    })
    // Un compte ADMIN n'est jamais débité (voir authorizeAIFeature) : le
    // rembourser ferait passer le compteur sous zéro et offrirait un quota
    // supplémentaire à tous les autres appels du mois.
    if (!user || user.role === 'ADMIN') return

    const remboursement = Math.min(montant, user.aiCreditsUsed)
    if (remboursement <= 0) return

    await prisma.user.update({
      where: { id: userId },
      data: { aiCreditsUsed: { decrement: remboursement } },
    })
    // Trace négative dans le journal d'usage : sans elle, la consommation
    // journalisée et le compteur de l'utilisateur divergent silencieusement.
    await prisma.aIUsageEvent.create({ data: { userId, action, credits: -remboursement } })
  } catch (error) {
    // Un remboursement raté ne doit pas transformer le 503 attendu en 500 :
    // l'indisponibilité de l'agent reste l'information utile pour l'appelant.
    console.error('rembourserCredits: remboursement impossible', error)
  }
}

export async function authorizeAIFeature(request: Request, action: string, credits = 1, minimum: keyof typeof PLAN_RANK = 'STARTER'): Promise<AuthorizedAIFeatureResult> {
  const access = await authorizeFeature(request, minimum)
  if ('response' in access) return access
  if (access.user.role === 'ADMIN') return { user: access.user, usage: { remaining: Number.MAX_SAFE_INTEGER, limit: Number.MAX_SAFE_INTEGER } }

  const usage = await consumeAICredits(access.user.id, action, credits)
  if (!usage.ok) return { response: NextResponse.json({ error: usage.reason, usage }, { status: 402 }) }
  return { user: access.user, usage }
}
