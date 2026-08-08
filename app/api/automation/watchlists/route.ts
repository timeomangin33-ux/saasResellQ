import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { auth } from '@/auth'
import { automationQueue } from '@/lib/queues'
import { authorizeFeature } from '@/lib/access-control'
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
    const access = await authorizeFeature('PRO')
    if ('response' in access) return access.response
    const user = access.user

    // Get trending categories
    const trendingCategories = await prisma.categoryMarket.findMany({
      where: {
        trendDirection: 'up',
        trendStrength: { in: ['strong', 'moderate'] },
      },
      orderBy: {
        avgMargin: 'desc',
      },
      take: 5,
    })

    // Get user's automation config
    const config = await prisma.automationConfig.findUnique({
      where: { userId: user.id },
    })

    const recommendations = trendingCategories.map((cat) => ({
      category: cat.category,
      reason: `Trending ${cat.trendDirection} with ${cat.trendStrength} momentum`,
      avgMargin: cat.avgMargin,
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
    const access = await authorizeFeature('PRO')
    if ('response' in access) return access.response
    const user = access.user
    const parsed = createWatchlistsSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
    const { autoCreate = true, categories = [] } = parsed.data

    // Add job to queue
    await automationQueue.add(
      {
        type: 'create-watchlist',
        userId: user.id,
        payload: {
          autoCreate,
          categories,
        },
      },
      {
        attempts: 2,
        removeOnComplete: true,
      }
    )

    return NextResponse.json({
      status: 'job-queued',
      message: 'Watchlist creation job has been queued',
      userId: user.id,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    )
  }
}
