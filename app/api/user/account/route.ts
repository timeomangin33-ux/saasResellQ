import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/prisma'
import { stripe } from '@/stripe-service'
import { errorResponse } from '@/lib/access-control'

const deleteAccountSchema = z.object({
  confirm: z.literal('SUPPRIMER'),
})

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return errorResponse('Connexion requise.', 401)

  const parsed = deleteAccountSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return errorResponse('Confirmation invalide.', 400)

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, stripeCustomerId: true, subscriptionId: true },
  })
  if (!user) return errorResponse('Utilisateur introuvable.', 404)

  if (stripe && user.subscriptionId) {
    try {
      await stripe.subscriptions.cancel(user.subscriptionId)
    } catch (err) {
      console.warn('[user/account] Failed to cancel Stripe subscription on account deletion:', err instanceof Error ? err.message : err)
    }
  }

  await prisma.user.delete({ where: { id: user.id } })

  return NextResponse.json({ ok: true })
}
