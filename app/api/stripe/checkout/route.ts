import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/prisma'
import { stripe, getCheckoutLineItemForPlan, getPriceIdForPlan, getPlanFromPriceId } from '@/stripe-service'
import { planFromCheckout } from '@/lib/plans'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    if (!stripe) {
      console.error('[stripe/checkout] Stripe not configured')
      return NextResponse.json({ error: 'Stripe n\'est pas configuré' }, { status: 500 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
    const rateLimit = checkRateLimit(`stripe-checkout:${ip}`, 8, 60_000)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Trop de tentatives, réessayez plus tard.' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } })
    }

    const session = await auth()
    if (!session?.user?.email) {
      console.warn('[stripe/checkout] Unauthenticated request', { session })
      return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      console.warn('[stripe/checkout] User not found', { email: session.user.email })
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const returnUrl = typeof body.returnUrl === 'string' ? body.returnUrl : `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/dashboard`
    const requestedPlan = typeof body.plan === 'string' ? body.plan.trim() : undefined
    const normalizedPlan = requestedPlan ? planFromCheckout(requestedPlan) : undefined
    if (requestedPlan && normalizedPlan === 'FREE') {
      return NextResponse.json({ error: "Forfait invalide pour l\'abonnement" }, { status: 400 })
    }

    let customerId = user.stripeCustomerId
    if (!customerId) {
      console.log('[stripe/checkout] Creating Stripe customer for', user.email)
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name ?? 'Utilisateur ResellQ',
      })

      customerId = customer.id
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      })
    } else {
      // Check Stripe directly rather than trusting our DB's cached status —
      // this is what actually stops a user from creating a second (or third)
      // subscription by retrying checkout, which is how duplicate billing
      // happened before.
      const existingActive = await stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 1 })
      const existingTrialing = existingActive.data.length === 0
        ? await stripe.subscriptions.list({ customer: customerId, status: 'trialing', limit: 1 })
        : { data: [] }
      if (existingActive.data.length > 0 || existingTrialing.data.length > 0) {
        return NextResponse.json(
          { error: 'Vous avez déjà un abonnement actif. Gérez-le depuis Facturation.' },
          { status: 409 },
        )
      }
    }

    const explicitPriceId = typeof body.priceId === 'string' ? body.priceId : undefined
    const priceId = explicitPriceId ?? getPriceIdForPlan(requestedPlan)
    const lineItem = explicitPriceId ? { price: priceId, quantity: 1 } : getCheckoutLineItemForPlan(requestedPlan)
    const checkoutPlan = normalizedPlan ?? getPlanFromPriceId(explicitPriceId)

    console.log('[stripe/checkout] Creating checkout session for customer', customerId, { plan: checkoutPlan, priceId })
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [lineItem],
      mode: 'subscription',
      success_url: returnUrl,
      cancel_url: returnUrl,
      billing_address_collection: 'required',
      locale: 'fr',
      allow_promotion_codes: true,
      metadata: {
        plan: checkoutPlan,
        source: 'resellq_checkout',
      },
      subscription_data: { metadata: { plan: checkoutPlan } },
    })

    console.log('[stripe/checkout] Checkout session created', { url: checkoutSession.url })
    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('[stripe/checkout] Error creating checkout session', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur lors de la création du checkout' }, { status: 500 })
  }
}
