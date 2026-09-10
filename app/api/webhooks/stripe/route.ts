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

/**
 * Enregistre ce qu'un partenaire a gagné sur une facture réellement encaissée.
 *
 * Rien n'est envoyé à personne ici : cette fonction n'écrit qu'une dette dans
 * `referral_commissions`. Le virement au partenaire reste un geste manuel de
 * l'exploitant, qui vient ensuite marquer la ligne comme payée.
 */
async function enregistrerCommission(userId: string, referralCode: string | null | undefined, invoice: any) {
  if (!referralCode) return

  const invoiceId = typeof invoice?.id === 'string' ? invoice.id : null
  if (!invoiceId) return

  const referral = await prisma.referral.findFirst({ where: { code: referralCode, actif: true } })
  // Partenariat terminé ou code supprimé : plus rien n'est dû sur les
  // renouvellements qui suivent.
  if (!referral) return

  // `amount_paid` est ce que Stripe a réellement collecté sur cette facture,
  // remise et avoir déduits. Le prix affiché du forfait ne l'est pas : une
  // commission calculée dessus paierait le partenaire sur de l'argent que
  // ResellQ n'a jamais reçu.
  const montantEncaisse = Number(invoice?.amount_paid ?? 0)
  if (!Number.isFinite(montantEncaisse) || montantEncaisse <= 0) return

  try {
    await prisma.referralCommission.create({
      data: {
        referralId: referral.id,
        userId,
        stripeInvoiceId: invoiceId,
        montantEncaisse,
        devise: typeof invoice?.currency === 'string' ? invoice.currency : 'eur',
        commissionPct: referral.commissionPct,
        montantDu: Math.round((montantEncaisse * referral.commissionPct) / 100),
        statut: 'du',
      },
    })
  } catch (error: any) {
    // Stripe rejoue un webhook dès que notre réponse se perd, et le garde-fou
    // `stripeWebhookEvent` n'est écrit qu'en fin de handler : un rejeu peut
    // donc repasser ici. L'unicité de `stripeInvoiceId` le fait échouer en
    // P2002, ce qui est exactement le résultat voulu — la facture a déjà sa
    // commission, on ne la compte pas deux fois.
    if (error?.code !== 'P2002') throw error
  }
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

          await enregistrerCommission(user.id, user.referralCode, invoice)
        }
      }
    }

    if (type === 'charge.refunded') {
      const charge = data.object as any
      // Stripe rattache la facture au paiement dans `charge.invoice`. Un
      // paiement sans facture (paiement isolé, hors abonnement) n'a jamais
      // engendré de commission : il n'y a rien à annuler.
      const invoiceId = typeof charge?.invoice === 'string' ? charge.invoice : (charge?.invoice?.id ?? null)

      if (invoiceId) {
        const rembourseEnEntier = charge?.refunded === true

        if (rembourseEnEntier) {
          // Une commission sur de l'argent rendu au client n'est pas due.
          // Seules les lignes encore en attente sont annulées : une ligne
          // déjà « paye » correspond à un virement qui a réellement eu lieu,
          // et réécrire ce fait effacerait une trace comptable.
          const annulees = await prisma.referralCommission.updateMany({
            where: { stripeInvoiceId: invoiceId, statut: 'du' },
            data: { statut: 'annule' },
          })

          if (annulees.count === 0) {
            const existante = await prisma.referralCommission.findUnique({ where: { stripeInvoiceId: invoiceId } })
            if (existante?.statut === 'paye') {
              console.warn(
                `[webhooks/stripe] facture ${invoiceId} remboursée alors que la commission de ${existante.montantDu} centimes a déjà été versée : à régulariser à la main.`,
              )
            }
          }
        } else {
          // Remboursement partiel : la part réellement due n'est plus celle
          // calculée, mais elle n'est pas nulle non plus. On ne devine pas un
          // montant à la place de l'exploitant, on le prévient.
          console.warn(
            `[webhooks/stripe] remboursement partiel sur la facture ${invoiceId} (${charge?.amount_refunded} / ${charge?.amount} centimes) : la commission reste due telle quelle, à arbitrer à la main.`,
          )
        }
      }
    }

    if (type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
      const subscription = data.object as any
      const customerId = subscription.customer as string
      const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } })
      if (user) {
        const status = normalizeStatus(subscription.status)
        const isCurrentSubscription = !user.subscriptionId || user.subscriptionId === subscription.id

        // A customer can end up with more than one Stripe subscription (e.g. a
        // retried checkout after an earlier attempt never completed). Only let
        // this event downgrade the user if it's about the subscription we
        // actually have on file — otherwise a stale/duplicate subscription's
        // async status change (e.g. an abandoned attempt expiring) could
        // clobber a newer, genuinely active subscription. An event reporting
        // an active subscription is always safe to adopt.
        if (status === 'ACTIVE' || isCurrentSubscription) {
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
