import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { authorizeAIFeature } from '@/lib/access-control'
import { runCreateWatchlists, runProductAnalysis, runProductSync, runNotifyUser } from '@/lib/automation-actions'
import { z } from 'zod'

export const maxDuration = 60

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
    const result = await handleAIAction(access.user.id, action, query, filters, access.user.role === 'ADMIN' || access.user.subscriptionPlan === 'BUSINESS')

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
  filters: Record<string, any>,
  canAutoCreateWatchlists: boolean
) {
  const lowerAction = action.toLowerCase()

  // 1. Create Watchlist
  if (lowerAction.includes('watchlist') || lowerAction.includes('créer watchlist')) {
    if (!canAutoCreateWatchlists) {
      return {
        status: 'error',
        action: 'watchlist_create_blocked',
        message: 'La création automatique de watchlists est réservée au forfait Business.',
      }
    }

    const { category, searchTerm } = extractWatchlistParams(query, filters)

    const result = await runCreateWatchlists(userId, category ? { categories: [category] } : {})

    return {
      status: 'success',
      action: 'watchlist_created',
      message: result.created > 0
        ? `${result.created} watchlist(s) créée(s) pour "${searchTerm || category}".`
        : (result.message || 'Aucune nouvelle watchlist créée.'),
      ...result,
    }
  }

  // 2. Analyze Products
  if (lowerAction.includes('analyz') || lowerAction.includes('analyzer')) {
    const result = await runProductAnalysis({ limit: filters.limit as number | undefined })

    return {
      status: 'success',
      action: 'analysis_started',
      message: `${result.analyzed} produit(s) analysé(s) par l'IA.`,
      ...result,
    }
  }

  // 3. Sync Products
  if (lowerAction.includes('sync') || lowerAction.includes('synchron')) {
    const result = await runProductSync({ limit: filters.limit as number | undefined })

    return {
      status: 'success',
      action: 'sync_started',
      message: `${result.synced} annonce(s) synchronisée(s) depuis Vinted sur ${result.categoriesScanned} catégorie(s).`,
      ...result,
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
      await runNotifyUser(userId, {
        title: '🎯 Opportunités trouvées',
        message: `${products.length} produit(s) avec une marge > ${filters.minMargin || 30}%`,
        type: 'alert',
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
      orderBy: [{ priceChangePercent: 'desc' }],
      take: 5,
    })

    return {
      status: 'success',
      action: 'category_insights',
      categories: categories.map((c) => ({
        name: c.category,
        trend: c.trendDirection,
        priceChangePercent: c.priceChangePercent,
        active: c.volumeActive,
        sold: c.volumeSold,
      })),
    }
  }

  // 6. Create Alert/Notification
  if (lowerAction.includes('alert') || lowerAction.includes('notif')) {
    const result = await runNotifyUser(userId, {
      title: filters.title || 'Alerte IA',
      message: query,
      type: 'alert',
    })

    return {
      status: 'success',
      action: 'alert_created',
      message: 'Notification créée.',
      ...result,
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
