import Stripe from 'stripe'

export function createStripeClient() {
  const secret = process.env.STRIPE_SECRET_KEY || ''
  if (!secret) throw new Error('STRIPE_SECRET_KEY not set')
  return new Stripe(secret, { apiVersion: '2024-06-20' as any })
}

export function createStripeCheckoutSession(customerId: string, priceId: string, successUrl: string, cancelUrl: string) {
  const stripe = createStripeClient()
  return stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    billing_address_collection: 'required',
    allow_promotion_codes: true,
  })
}

export function createStripeBillingPortalSession(customerId: string, returnUrl: string) {
  const stripe = createStripeClient()
  return stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl })
}
