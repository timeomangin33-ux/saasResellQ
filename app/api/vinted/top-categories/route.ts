import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { authorizeAuthenticatedUser } from '@/lib/access-control'

/**
 * Real category market data only.
 *
 * This route used to build its response from VINTED_CATEGORIES and
 * getProductsByCategory() in vinted.ts - a hardcoded array the file itself
 * labels "Top ventes simulées". It returned `source: 'db'` while serving
 * invented product names, margins and demand scores, and the genuine
 * database branch below it was unreachable dead code because the simulated
 * list was never empty. Paying customers were reading fabricated numbers
 * under a "Live sync" badge.
 *
 * Everything here now comes from CategoryMarket (written by the daily
 * market-refresh cron) and Product (written by the Vinted scraper).
 * Fields the pipeline does not compute yet - profit margin and demand score,
 * which need the AI scoring pass - are returned as null so the UI can show an
 * honest placeholder instead of a made-up figure.
 */
export async function GET(request: Request) {
  // Read-only aggregate market data: open to FREE accounts (see top-products).
  const access = await authorizeAuthenticatedUser(request)
  if ('response' in access) return access.response

  try {
    const [markets, grouped] = await Promise.all([
      prisma.categoryMarket.findMany({
        select: {
          category: true,
          avgPrice: true,
          medianPrice: true,
          avgMargin: true,
          volumeActive: true,
          trendDirection: true,
          priceChangePercent: true,
          lastAnalyzedAt: true,
        },
      }),
      prisma.product.groupBy({
        by: ['category'],
        where: { status: 'active', category: { not: '' } },
        _count: { category: true },
        _avg: { price: true },
      }),
    ])

    const marketByCategory = new Map(markets.map((m) => [m.category, m]))
    const countByCategory = new Map(grouped.map((g) => [g.category, g]))

    // Only surface categories we actually hold scraped products for. A
    // category with no rows has nothing truthful to display.
    const names = Array.from(countByCategory.keys()).sort()

    const categories = await Promise.all(
      names.map(async (name) => {
        const market = marketByCategory.get(name)
        const group = countByCategory.get(name)

        const topItems = await prisma.product.findMany({
          where: { category: name, status: 'active' },
          orderBy: [
            { analysisScore: { sort: 'desc', nulls: 'last' } },
            { price: 'desc' },
          ],
          take: 20,
          select: {
            title: true,
            brand: true,
            price: true,
            size: true,
            condition: true,
            url: true,
            profitMargin: true,
            analysisScore: true,
          },
        })

        return {
          name,
          category: name,
          trend_direction: market?.trendDirection ?? null,
          price_change_percent: market?.priceChangePercent ?? null,
          avg_price: market?.avgPrice ?? group?._avg.price ?? null,
          median_price: market?.medianPrice ?? null,
          avg_margin: market?.avgMargin ?? null,
          volume_active: market?.volumeActive ?? group?._count.category ?? 0,
          product_count: group?._count.category ?? 0,
          last_analyzed_at: market?.lastAnalyzedAt ?? null,
          topItems: topItems.map((product) => ({
            title: product.title,
            brand: product.brand,
            price: product.price,
            size: product.size,
            condition: product.condition,
            url: product.url,
            profitMargin: product.profitMargin,
            analysisScore: product.analysisScore,
          })),
        }
      })
    )

    // Busiest markets first - that ordering is derived from real row counts.
    categories.sort((a, b) => b.product_count - a.product_count)

    return NextResponse.json({ categories })
  } catch (err) {
    console.error('top-categories db error:', err)
    return NextResponse.json({ error: 'Impossible de charger les catégories.' }, { status: 500 })
  }
}
