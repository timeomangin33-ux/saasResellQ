import { NextResponse } from 'next/server'
import { constructStripeEvent, stripe } from '@/stripe-service'
import { prisma } from '@/prisma'
import { nextMonthlyReset, planFromCheckout } from '@/lib/plans'

function normalizeStatus(stripeStatus: string) {
  const normalized = stripeStatus.toUpperCase()
  if (normalized === 'ACTIVE' || normalized === 'TRIALING') return 'ACTIVE'
  if (normalized === 'PAST_DUE' || normalized === 'UNPAID' || normalized === 'INCOMPLETE') return 'PAST_DUE'
  return 'INACTIVE'
}

function subscriptionPlan(metadata?: Record<string, string>) {
  const value = metadata?.plan
  return value === 'STARTER' || value === 'PRO' || value === 'BUSINESS' ? value : planFromCheckout(value)
}

export async function POST(request: Request) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe non configuré' }, { status: 500 })
    }

    const event = await constructStripeEvent(request)
    const { type, data } = event
    const processed = await prisma.stripeWebhookEvent.findUnique({ where: { id: event.id } })
    if (processed) return NextResponse.json({ received: true, duplicate: true })

    if (type === 'checkout.session.completed') {
      const session = data.object as any
      const customerId = session.customer as string | undefined
      const subscriptionId = session.subscription as string | undefined
      const customerEmail = session.customer_email as string | undefined

      if (!customerId || !subscriptionId) {
        return NextResponse.json({ received: true })
      }

      const user = await prisma.user.findFirst({
        where: {
          OR: [{ stripeCustomerId: customerId }, { email: customerEmail }],
        },
      })

      if (user) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const plan = subscriptionPlan(subscription.metadata ?? session.metadata)
        await prisma.user.update({
          where: { id: user.id },
          data: {
            stripeCustomerId: customerId,
            subscriptionId,
            subscriptionStatus: normalizeStatus(subscription.status),
            subscriptionPlan: plan,
            aiCreditsUsed: 0,
            aiCreditsResetAt: nextMonthlyReset(),
            subscriptionEnd: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000)
              : undefined,
          },
        })
      }
    }

    if (type === 'invoice.payment_succeeded') {
      const invoice = data.object as any
      const subscriptionId = invoice.subscription as string | undefined
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const customerId = subscription.customer as string
        const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } })
        if (user) {
          const plan = subscriptionPlan(subscription.metadata)
          await prisma.user.update({
            where: { id: user.id },
            data: {
            subscriptionId,
            subscriptionStatus: normalizeStatus(subscription.status),
            subscriptionPlan: plan,
            aiCreditsUsed: 0,
            aiCreditsResetAt: nextMonthlyReset(),
              subscriptionEnd: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000)
                : undefined,
            },
          })
        }
      }
    }

    if (type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
      const subscription = data.object as any
      const customerId = subscription.customer as string
      const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } })
      if (user) {
        const status = normalizeStatus(subscription.status)
        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionId: subscription.id,
            subscriptionStatus: status,
            subscriptionPlan: status === 'ACTIVE' ? subscriptionPlan(subscription.metadata) : 'FREE',
            subscriptionEnd: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000)
              : undefined,
          },
        })
      }
    }

    try {
      await prisma.stripeWebhookEvent.create({ data: { id: event.id, type } })
    } catch (error: any) {
      if (error?.code !== 'P2002') throw error
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur webhook unknown'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
