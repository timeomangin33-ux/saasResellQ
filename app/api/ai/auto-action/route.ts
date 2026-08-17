import { NextRequest, NextResponse } from 'next/server'
import { automationQueue } from '@/lib/queues'
import { prisma } from '@/prisma'
import { authorizeAIFeature } from '@/lib/access-control'
import { z } from 'zod'

const actionSchema = z.object({
  action: z.string().trim().min(2).max(60),
  query: z.string().trim().min(1).max(500),
  filters: z.object({
    category: z.string().trim().max(100).optional(),
    minMargin: z.coerce.number().min(0).max(100).optional(),
    minPrice: z.coerce.number().min(0).max(100000).optional(),
    maxPrice: z.coerce.number().min(0).max(100000).optional(),
    maxRisk: z.enum(['low', 'medium', 'high']).optional(),
    title: z.string().trim().max(120).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    forceRefresh: z.boolean().optional(),
  }).default({}),
})

/**
 * POST /api/ai/auto-action
 * 
 * This endpoint allows the AI agent to trigger automated actions
 * Examples:
 * - "Create watchlist for Nike sneakers with >30% margin"
 * - "Analyze all products in Clothing category"
 * - "Notify me if Apple Watch drops below €50"
 */
export async function POST(request: NextRequest) {
  try {
    const access = await authorizeAIFeature(request, 'automation_action', 2, 'PRO')
    if ('response' in access) return access.response
    const parsed = actionSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: 'Paramètres d\'automatisation invalides.' }, { status: 400 })
    const { action, query, filters } = parsed.data

    // Parse AI action and create corresponding job
    const result = await handleAIAction(access.user.id, action, query, filters)

    return NextResponse.json({ ...result, usage: access.usage })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    )
  }
}

/**
 * Handle various AI automation actions
 */
async function handleAIAction(
  userId: string,
  action: string,
  query: string,
  filters: Record<string, any>
) {
  const lowerAction = action.toLowerCase()

  // 1. Create Watchlist
  if (lowerAction.includes('watchlist') || lowerAction.includes('créer watchlist')) {
    const { category, minMargin, maxPrice, searchTerm } = extractWatchlistParams(query, filters)

    await automationQueue.add({
      type: 'create-watchlist',
      userId,
      payload: {
        name: `📌 ${searchTerm || category || 'Custom'} - IA Generated`,
        query: searchTerm || category,
        category,
        minPrice: filters.minPrice || 10,
        maxPrice: maxPrice || 500,
      },
    })

    return {
      status: 'queued',
      action: 'watchlist_created',
      message: `Watchlist created for "${searchTerm || category}" with margin > ${minMargin}%`,
    }
  }

  // 2. Analyze Products
  if (lowerAction.includes('analyz') || lowerAction.includes('analyzer')) {
    const { category, minMargin } = extractWatchlistParams(query, filters)

    await automationQueue.add({
      type: 'analyze-products',
      userId,
      payload: {
        category,
        minMargin: minMargin || 25,
        limit: filters.limit || 100,
      },
    })

    return {
      status: 'queued',
      action: 'analysis_started',
      message: `Analyzing products${category ? ` in ${category}` : ''} for profitability...`,
    }
  }

  // 3. Sync Products
  if (lowerAction.includes('sync') || lowerAction.includes('synchron')) {
    const { category } = extractWatchlistParams(query, filters)

    await automationQueue.add({
      type: 'sync-products',
      userId,
      payload: {
        category,
        limit: filters.limit || 200,
        forceRefresh: filters.forceRefresh || false,
      },
    })

    return {
      status: 'queued',
      action: 'sync_started',
      message: `Syncing products from Vinted${category ? ` for ${category}` : ''}...`,
    }
  }

  // 4. Get Trending Opportunities
  if (lowerAction.includes('opportunit') || lowerAction.includes('deal')) {
    const products = await prisma.product.findMany({
      where: {
        profitMargin: {
          gte: filters.minMargin || 30,
        },
        riskLevel: filters.maxRisk ? { in: getRiskLevels(filters.maxRisk) } : undefined,
        status: 'active',
      },
      orderBy: { profitMargin: 'desc' },
      take: 10,
    })

    // Create notification about top opportunities
    if (products.length > 0) {
      await automationQueue.add({
        type: 'notify-user',
        userId,
        payload: {
          title: '🎯 Top Opportunities Found',
          message: `Found ${products.length} products with margin > ${filters.minMargin || 30}%`,
          type: 'alert',
        },
      })
    }

    return {
      status: 'success',
      action: 'opportunities_found',
      count: products.length,
      topOpportunities: products.slice(0, 3).map((p) => ({
        title: p.title,
        margin: p.profitMargin,
        price: p.price,
        category: p.category,
      })),
    }
  }

  // 5. Get Category Insights
  if (lowerAction.includes('categor') || lowerAction.includes('trend')) {
    const categories = await prisma.categoryMarket.findMany({
      orderBy: { avgMargin: 'desc' },
      take: 5,
    })

    return {
      status: 'success',
      action: 'category_insights',
      categories: categories.map((c) => ({
        name: c.category,
        avgMargin: c.avgMargin,
        trend: c.trendDirection,
        active: c.volumeActive,
        sold: c.volumeSold,
      })),
    }
  }

  // 6. Create Alert/Notification
  if (lowerAction.includes('alert') || lowerAction.includes('notif')) {
    await automationQueue.add({
      type: 'notify-user',
      userId,
      payload: {
        title: filters.title || 'AI Alert',
        message: query,
        type: 'alert',
      },
    })

    return {
      status: 'queued',
      action: 'alert_created',
      message: 'Notification has been queued',
    }
  }

  // Default: Run general analysis
  return {
    status: 'error',
    message: `Action "${action}" not recognized. Try: watchlist, analyze, sync, opportunities, categories, alert`,
  }
}

/**
 * Extract watchlist parameters from query
 */
function extractWatchlistParams(query: string, filters: any) {
  const categoryMatch = query.match(/category:?\s*([a-zA-Z\s]+)/i)
  const marginMatch = query.match(/margin:?\s*([0-9]+)/i)
  const priceMatch = query.match(/price:?\s*([0-9]+)/i)

  return {
    category: filters.category || categoryMatch?.[1]?.trim() || undefined,
    minMargin: filters.minMargin || parseInt(marginMatch?.[1] || '25'),
    maxPrice: filters.maxPrice || parseInt(priceMatch?.[1] || '500'),
    searchTerm: query.replace(/category:|margin:|price:/gi, '').trim(),
  }
}

/**
 * Helper: Get risk levels
 */
function getRiskLevels(maxRisk: string): string[] {
  const levels: Record<string, string[]> = {
    low: ['low'],
    medium: ['low', 'medium'],
    high: ['low', 'medium', 'high'],
  }
  return levels[maxRisk.toLowerCase()] || ['low', 'medium', 'high']
}
