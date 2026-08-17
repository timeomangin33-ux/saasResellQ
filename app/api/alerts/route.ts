import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/prisma'
import { authorizeAuthenticatedUser, errorResponse } from '@/lib/access-control'

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
  const access = await authorizeAuthenticatedUser(request)
  if ('response' in access) return access.response

  const parsed = createAlertSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return errorResponse('Paramètres invalides.', 400)

  const alert = await prisma.alert.create({
    data: { userId: access.user.id, ...parsed.data },
  })

  return NextResponse.json({ alert }, { status: 201 })
}
