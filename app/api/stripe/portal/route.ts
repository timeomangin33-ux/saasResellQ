import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/prisma'
import { stripe } from '@/stripe-service'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    if (!stripe) {
      console.error('[stripe/portal] Stripe not configured')
      return NextResponse.json({ error: 'Stripe n\'est pas configuré' }, { status: 500 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
    const rateLimit = checkRateLimit(`stripe-portal:${ip}`, 8, 60_000)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Trop de tentatives, réessayez plus tard.' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } })
    }

    const session = await auth()
    if (!session?.user?.email) {
      console.warn('[stripe/portal] Unauthenticated request')
      return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user || !user.stripeCustomerId) {
      console.warn('[stripe/portal] No stripe customer for user', { email: session.user.email })
      return NextResponse.json({ error: 'Aucun client Stripe associé' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const returnUrl = typeof body.returnUrl === 'string' ? body.returnUrl : `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/dashboard`

    console.log('[stripe/portal] Creating portal session for', user.stripeCustomerId)
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl,
    })

    console.log('[stripe/portal] Portal session created', { url: portalSession.url })
    return NextResponse.json({ url: portalSession.url })
  } catch (err) {
    console.error('[stripe/portal] Error creating portal session', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur lors de l\'ouverture du portail de facturation' }, { status: 500 })
  }
}
