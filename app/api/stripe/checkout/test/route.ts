import { NextResponse } from 'next/server'
import { stripe } from '@/stripe-service'
import { getCheckoutLineItemForPlan } from '@/stripe-service'
import { requireInternalAccess } from '@/lib/access-control'

export async function POST(request: Request) {
  const access = requireInternalAccess(request)
  if ('response' in access) return access.response

  try {
    if (!stripe) {
      console.error('[stripe/checkout/test] Stripe not configured')
      return NextResponse.json({ error: 'Stripe n&apos;est pas configuré' }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const plan = typeof body.plan === 'string' ? body.plan : undefined
    const email = typeof body.email === 'string' ? body.email : undefined
    const returnUrl = typeof body.returnUrl === 'string' ? body.returnUrl : `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/dashboard`

    if (!email) {
      console.error('[stripe/checkout/test] Missing test email')
      return NextResponse.json({ error: 'Missing test email' }, { status: 400 })
    }

    const lineItem = getCheckoutLineItemForPlan(plan)

    console.log('[stripe/checkout/test] Creating test checkout session', { plan, email, returnUrl })
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [lineItem],
      mode: 'subscription',
      success_url: returnUrl,
      cancel_url: returnUrl,
      billing_address_collection: 'required',
      customer_email: email,
      locale: 'fr',
      allow_promotion_codes: true,
      metadata: { source: 'resellq_checkout_test' },
    })

    console.log('[stripe/checkout/test] created', { url: checkoutSession.url })
    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('[stripe/checkout/test] Error creating checkout session', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur lors de la création du checkout' }, { status: 500 })
  }
}
