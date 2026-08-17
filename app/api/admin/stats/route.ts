import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { getCurrentUser, errorResponse } from '@/lib/access-control'
import { PLAN_CONFIG, type PlanKey } from '@/lib/plans'

export async function GET(request: Request) {
  const user = await getCurrentUser(request)
  if (!user) return errorResponse('Connexion requise.', 401)
  if (user.role !== 'ADMIN') return errorResponse('Accès administrateur requis.', 403)

  const now = new Date()
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    usersThisMonth,
    usersLastMonth,
    planGroups,
    recentUsers,
    productsCount,
    vintedAccountsCount,
    jobsLast24h,
    failedJobsLast24h,
    webhookEventsLast24h,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: startOfThisMonth } } }),
    prisma.user.count({ where: { createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } } }),
    prisma.user.groupBy({
      by: ['subscriptionPlan'],
      where: { subscriptionStatus: 'ACTIVE' },
      _count: { _all: true },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, email: true, name: true, subscriptionPlan: true, subscriptionStatus: true, createdAt: true, role: true },
    }),
    prisma.product.count(),
    prisma.vintedAccount.count(),
    prisma.automationJob.count({ where: { createdAt: { gte: oneDayAgo } } }),
    prisma.automationJob.count({ where: { createdAt: { gte: oneDayAgo }, status: 'failed' } }),
    prisma.stripeWebhookEvent.count({ where: { processedAt: { gte: oneDayAgo } } }),
  ])

  const activeByPlan = planGroups.reduce<Record<string, number>>((acc, g) => {
    acc[g.subscriptionPlan] = g._count._all
    return acc
  }, {})

  const activeSubscriptions = Object.values(activeByPlan).reduce((sum, n) => sum + n, 0)
  const mrr = Object.entries(activeByPlan).reduce((sum, [plan, count]) => {
    const config = PLAN_CONFIG[plan as PlanKey]
    return sum + (config ? config.price * count : 0)
  }, 0)

  const userGrowthPct = usersLastMonth > 0
    ? Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 1000) / 10
    : usersThisMonth > 0 ? 100 : 0

  return NextResponse.json({
    totalUsers,
    usersThisMonth,
    userGrowthPct,
    activeSubscriptions,
    activeByPlan,
    mrr,
    productsCount,
    vintedAccountsCount,
    jobsLast24h,
    failedJobsLast24h,
    webhookEventsLast24h,
    recentUsers,
  })
}
