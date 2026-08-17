import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/prisma'
import { getPlanConfig } from '@/lib/plans'
import { checkRateLimit } from '@/lib/rate-limit'
import { stripe } from '@/stripe-service'

export async function GET(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
    const rateLimit = checkRateLimit(`subscription-info:${ip}`, 20, 60_000)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Trop de requêtes, réessayez plus tard.' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } })
    }

    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        stripeCustomerId: true,
        subscriptionId: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        subscriptionEnd: true,
        aiCreditsUsed: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const plan = getPlanConfig(user.subscriptionPlan)

    let paymentMethod: { brand: string; last4: string; expMonth: number; expYear: number } | null = null
    let cancelAtPeriodEnd = false
    if (stripe && user.stripeCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(user.stripeCustomerId, {
          expand: ['invoice_settings.default_payment_method'],
        })
        if (customer && !customer.deleted) {
          const pm = customer.invoice_settings?.default_payment_method
          if (pm && typeof pm !== 'string' && pm.card) {
            paymentMethod = {
              brand: pm.card.brand,
              last4: pm.card.last4,
              expMonth: pm.card.exp_month,
              expYear: pm.card.exp_year,
            }
          }
        }
        if (user.subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(user.subscriptionId)
          cancelAtPeriodEnd = subscription.cancel_at_period_end
        }
      } catch (err) {
        console.warn('[subscription/info] Stripe lookup failed:', err instanceof Error ? err.message : err)
      }
    }

    return NextResponse.json({
      stripeCustomerId: user.stripeCustomerId,
      subscriptionId: user.subscriptionId,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionEnd: user.subscriptionEnd,
      cancelAtPeriodEnd,
      planName: plan.label,
      planPrice: plan.price || null,
      planFeatures: plan.features,
      aiCreditsUsed: user.aiCreditsUsed,
      aiCreditsIncluded: plan.credits,
      paymentMethod,
    })
  } catch (err) {
    console.error('[subscription/info] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
