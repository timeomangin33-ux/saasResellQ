import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/prisma'
import { authorizeFeature, authorizeAuthenticatedUser, errorResponse } from '@/lib/access-control'
import { getPlanLimits } from '@/lib/plans'

const createWatchlistSchema = z.object({
  name: z.string().trim().min(1).max(120),
  query: z.string().trim().min(1).max(200),
  category: z.string().trim().max(100).optional().nullable(),
  minPrice: z.coerce.number().min(0).max(100000).optional().nullable(),
  maxPrice: z.coerce.number().min(0).max(100000).optional().nullable(),
})

export async function GET(request: Request) {
  const access = await authorizeAuthenticatedUser(request)
  if ('response' in access) return access.response

  const watchlists = await prisma.watchlist.findMany({
    where: { userId: access.user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ watchlists })
}

export async function POST(request: Request) {
  const access = await authorizeFeature(request, 'STARTER')
  if ('response' in access) return access.response

  const parsed = createWatchlistSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return errorResponse('Paramètres invalides.', 400)
  const { name, query, category, minPrice, maxPrice } = parsed.data

  if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
    return errorResponse('Le prix minimum doit être inférieur au prix maximum.', 400)
  }

  if (access.user.role !== 'ADMIN') {
    const limit = getPlanLimits(access.user.subscriptionPlan).watchlists
    const count = await prisma.watchlist.count({ where: { userId: access.user.id } })
    if (count >= limit) {
      return errorResponse(`Limite de ${limit} watchlists atteinte pour votre forfait. Passez à un forfait supérieur pour en créer davantage.`, 403)
    }
  }

  const watchlist = await prisma.watchlist.create({
    data: {
      userId: access.user.id,
      name,
      query,
      category: category || null,
      minPrice: minPrice ?? null,
      maxPrice: maxPrice ?? null,
    },
  })

  return NextResponse.json({ watchlist }, { status: 201 })
}
