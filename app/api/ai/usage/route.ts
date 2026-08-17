import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/prisma'
import { getPlanConfig } from '@/lib/plans'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Connexion requise' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { subscriptionPlan: true, subscriptionStatus: true, aiCreditsUsed: true, aiCreditsResetAt: true } })
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  const plan = getPlanConfig(user.subscriptionPlan)
  return NextResponse.json({ plan: user.subscriptionPlan, planLabel: plan.label, active: user.subscriptionStatus === 'ACTIVE', limit: plan.credits, used: user.aiCreditsUsed, remaining: Math.max(0, plan.credits - user.aiCreditsUsed), resetsAt: user.aiCreditsResetAt })
}
