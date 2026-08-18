import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/prisma'
import { authorizeFeature, authorizeAuthenticatedUser, errorResponse } from '@/lib/access-control'
import { getPlanLimits } from '@/lib/plans'

const CONDITIONS = ['profit_margin', 'price_drop', 'demand_spike'] as const

const createAlertSchema = z.object({
  category: z.string().trim().min(1).max(100),
  condition: z.enum(CONDITIONS),
  threshold: z.coerce.number().min(0).max(1000),
})

export async function GET(request: Request) {
  const access = await authorizeAuthenticatedUser(request)
  if ('response' in access) return access.response

  const alerts = await prisma.alert.findMany({
    where: { userId: access.user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ alerts })
}

export async function POST(request: Request) {
  const access = await authorizeFeature(request, 'STARTER')
  if ('response' in access) return access.response

  const parsed = createAlertSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return errorResponse('Paramètres invalides.', 400)

  if (access.user.role !== 'ADMIN') {
    const limit = getPlanLimits(access.user.subscriptionPlan).alerts
    const count = await prisma.alert.count({ where: { userId: access.user.id } })
    if (count >= limit) {
      return errorResponse(`Limite de ${limit} alerte(s) atteinte pour votre forfait. Passez à un forfait supérieur pour en créer davantage.`, 403)
    }
  }

  const alert = await prisma.alert.create({
    data: { userId: access.user.id, ...parsed.data },
  })

  return NextResponse.json({ alert }, { status: 201 })
}
