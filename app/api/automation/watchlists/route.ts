import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { authorizeFeature } from '@/lib/access-control'
import { runCreateWatchlists } from '@/lib/automation-actions'
import { z } from 'zod'

const createWatchlistsSchema = z.object({
  autoCreate: z.boolean().optional(),
  categories: z.array(z.string().trim().min(1).max(100)).max(10).optional(),
})

/**
 * GET /api/automation/watchlists - Get AI-recommended watchlists
 */
export async function GET(request: NextRequest) {
  try {
    const access = await authorizeFeature(request, 'PRO')
    if ('response' in access) return access.response
    const user = access.user

    // Get trending categories (based on real data from the daily market scan)
    const trendingCategories = await prisma.categoryMarket.findMany({
      where: { trendDirection: 'up' },
      orderBy: [{ priceChangePercent: 'desc' }],
      take: 5,
    })

    // Get user\'s automation config
    const config = await prisma.automationConfig.findUnique({
      where: { userId: user.id },
    })

    const recommendations = trendingCategories.map((cat) => ({
      category: cat.category,
      reason: `Prix en hausse de ${cat.priceChangePercent?.toFixed(1) ?? '?'}% depuis le dernier scan`,
      volumeActive: cat.volumeActive,
      suggestion: {
        name: `📈 ${cat.category} (${new Date().toLocaleDateString()})`,
        query: cat.category,
        category: cat.category,
        minMargin: config?.minProfitMargin || 25.0,
      },
    }))

    return NextResponse.json(recommendations)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/automation/watchlists - Auto-create watchlists based on trends
 */
export async function POST(request: NextRequest) {
  try {
    const access = await authorizeFeature(request, 'PRO')
    if ('response' in access) return access.response
    const user = access.user
    const parsed = createWatchlistsSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
    const { categories = [] } = parsed.data

    const result = await runCreateWatchlists(user.id, { categories })

    return NextResponse.json({ status: 'completed', ...result })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    )
  }
}
