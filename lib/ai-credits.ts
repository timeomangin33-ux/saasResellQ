import { prisma } from '@/prisma'
import { getPlanConfig, nextMonthlyReset } from '@/lib/plans'

export async function consumeAICredits(userId: string, action: string, credits = 1) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionPlan: true, subscriptionStatus: true, aiCreditsUsed: true, aiCreditsResetAt: true } })
  if (!user || user.subscriptionStatus !== 'ACTIVE') return { ok: false, reason: 'Un abonnement actif est requis.', remaining: 0, limit: 0 }

  const limit = getPlanConfig(user.subscriptionPlan).credits
  const mustReset = !user.aiCreditsResetAt || user.aiCreditsResetAt <= new Date()
  if (mustReset) {
    await prisma.user.update({ where: { id: userId }, data: { aiCreditsUsed: 0, aiCreditsResetAt: nextMonthlyReset() } })
  }

  const used = mustReset ? 0 : user.aiCreditsUsed
  if (used + credits > limit) return { ok: false, reason: 'Votre quota IA mensuel est atteint. Passez à un forfait supérieur pour continuer.', remaining: Math.max(0, limit - used), limit }

  const update = await prisma.user.updateMany({ where: { id: userId, aiCreditsUsed: { lte: limit - credits } }, data: { aiCreditsUsed: { increment: credits } } })
  if (update.count !== 1) return { ok: false, reason: 'Votre quota IA mensuel est atteint.', remaining: 0, limit }
  await prisma.aIUsageEvent.create({ data: { userId, action, credits } })
  return { ok: true, remaining: limit - used - credits, limit }
}
