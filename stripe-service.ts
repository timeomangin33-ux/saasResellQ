import { createStripeClient } from '@/src/providers/payments/stripe.provider'

const stripeSecret = process.env.STRIPE_SECRET_KEY
export const stripe = stripeSecret ? createStripeClient() : null

// Backwards-compatible single price ID (existing usage)
export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID ?? ''

// Per-plan price IDs (recommended)
export const STRIPE_PRICE_ID_29 = process.env.STRIPE_PRICE_ID_29 ?? ''
export const STRIPE_PRICE_ID_75 = process.env.STRIPE_PRICE_ID_75 ?? ''
export const STRIPE_PRICE_ID_149 = process.env.STRIPE_PRICE_ID_149 ?? ''

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? ''

const DEFAULT_CHECKOUT_IMAGE = 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80'

export function getCheckoutPlanConfig(plan?: string) {
  switch (plan) {
    case '29':
      return {
        amount: 2900,
        name: 'ResellQ Starter',
        description: 'Analyse les tendances Vinted, détecte les meilleures opportunités et gagne du temps avec des alertes et rapports de base.',
        imageUrl: process.env.STRIPE_CHECKOUT_IMAGE_URL ?? (process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/,'')}/resellq-logo.svg` : DEFAULT_CHECKOUT_IMAGE),
      }
    case '75':
      return {
        amount: 7500,
        name: 'ResellQ Pro',
        description: 'Accède à l&apos;analyse avancée, aux alertes en temps réel et à une vue claire sur les produits qui méritent le plus votre attention.',
        imageUrl: process.env.STRIPE_CHECKOUT_IMAGE_URL ?? (process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/,'')}/resellq-logo.svg` : DEFAULT_CHECKOUT_IMAGE),
      }
    case '149':
      return {
        amount: 14900,
        name: 'ResellQ Business',
        description: 'Débloque les automations, les intégrations et un suivi pro pour accélérer votre activité et améliorer votre marge.',
        imageUrl: process.env.STRIPE_CHECKOUT_IMAGE_URL ?? (process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/,'')}/resellq-logo.svg` : DEFAULT_CHECKOUT_IMAGE),
      }
    default:
      return {
        amount: 7500,
        name: 'ResellQ Pro',
        description: 'Accède à l&apos;analyse avancée, aux alertes en temps réel et à une vue claire sur les produits qui méritent le plus votre attention.',
        imageUrl: process.env.STRIPE_CHECKOUT_IMAGE_URL ?? (process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/,'')}/resellq-logo.svg` : DEFAULT_CHECKOUT_IMAGE),
      }
  }
}

export function getPlanFromPriceId(priceId?: string) {
  if (!priceId) return 'PRO'
  if (priceId === STRIPE_PRICE_ID_29) return 'STARTER'
  if (priceId === STRIPE_PRICE_ID_75) return 'PRO'
  if (priceId === STRIPE_PRICE_ID_149) return 'BUSINESS'
  return 'PRO'
}

export function getCheckoutLineItemForPlan(plan?: string) {
  const config = getCheckoutPlanConfig(plan)

  return {
    quantity: 1,
    price_data: {
      currency: 'eur',
      unit_amount: config.amount,
      recurring: { interval: 'month' as const },
      product_data: {
        name: config.name,
        description: config.description,
        images: [config.imageUrl],
      },
    },
  }
}

export async function createStripeCustomer(email: string, name: string) {
  if (!stripe) throw new Error('Stripe non configuré')
  return stripe.customers.create({ email, name })
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) {
  if (!stripe) throw new Error('Stripe non configuré')
  return stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    customer_email: undefined,
  })
}

export async function createPortalSession(customerId: string, returnUrl: string) {
  if (!stripe) throw new Error('Stripe non configuré')
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}

export function getPriceIdForPlan(plan?: string) {
  switch (plan) {
    case '29':
      return STRIPE_PRICE_ID_29 || STRIPE_PRICE_ID
    case '75':
      return STRIPE_PRICE_ID_75 || STRIPE_PRICE_ID
    case '149':
      return STRIPE_PRICE_ID_149 || STRIPE_PRICE_ID
    default:
      return STRIPE_PRICE_ID
  }
}

export async function constructStripeEvent(request: Request) {
  if (!stripe) throw new Error('Stripe non configuré')
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET not set')
  }

  const payload = await request.text()
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    throw new Error('Signature Stripe manquante')
  }

  return stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET)
}
