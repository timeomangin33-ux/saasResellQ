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

export async function authorizeAIFeature(request: Request, action: string, credits = 1, minimum: keyof typeof PLAN_RANK = 'STARTER'): Promise<AuthorizedAIFeatureResult> {
  const access = await authorizeFeature(request, minimum)
  if ('response' in access) return access
  if (access.user.role === 'ADMIN') return { user: access.user, usage: { remaining: Number.MAX_SAFE_INTEGER, limit: Number.MAX_SAFE_INTEGER } }

  const usage = await consumeAICredits(access.user.id, action, credits)
  if (!usage.ok) return { response: NextResponse.json({ error: usage.reason, usage }, { status: 402 }) }
  return { user: access.user, usage }
}
