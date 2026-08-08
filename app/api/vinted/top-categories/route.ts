import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { getProductsByCategory, VINTED_CATEGORIES } from '@/vinted'
import { authorizeFeature } from '@/lib/access-control'

function normalizeText(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

function buildCategoryPayload(item: any) {
  const name = item?.name ?? item?.category ?? item?.categoryName ?? 'Catégorie'
  const topItems = getProductsByCategory(name, 20).map((product) => ({
    title: product.title,
    brand: product.brand,
    price: product.price,
    demandScore: product.demandScore,
    profitMargin: product.profitMargin,
    trendPercent: product.trendPercent,
    sales: product.sales,
  }))

  const rawTrendStrength = item?.trend_strength ?? item?.trendStrength ?? 0
  const trendStrength = typeof rawTrendStrength === 'string' ? Number(rawTrendStrength) : rawTrendStrength

  return {
    name,
    category: name,
    trend_direction: item?.trend_direction ?? item?.trendDirection ?? (typeof trendStrength === 'number' && trendStrength > 0 ? 'up' : 'stable'),
    trend_strength: Number.isFinite(trendStrength) ? trendStrength : 0,
    last_analyzed_at: item?.last_analyzed_at ?? item?.lastAnalyzedAt?.toISOString?.() ?? null,
    topItems,
  }
}

export async function GET(request: Request) {
  const access = await authorizeFeature('STARTER')
  if ('response' in access) return access.response

  try {
    const syncedCategories = await prisma.categoryMarket.findMany({
      orderBy: { category: 'asc' },
      select: { category: true, trendDirection: true, trendStrength: true, lastAnalyzedAt: true },
    })

    const syncedMap = new Map<string, any>()
    syncedCategories.forEach((item) => syncedMap.set(normalizeText(item.category), item))

    const categories = VINTED_CATEGORIES.map((category) => {
      const synced = syncedMap.get(normalizeText(category.name))
      const rawTrendStrength = synced?.trendStrength ?? category.demandScore ?? 0
      const trendStrength = typeof rawTrendStrength === 'string' ? Number(rawTrendStrength) : rawTrendStrength
      const topItems = getProductsByCategory(category.name, 20).map((product) => ({
        title: product.title,
        brand: product.brand,
        price: product.price,
        demandScore: product.demandScore,
        profitMargin: product.profitMargin,
        trendPercent: product.trendPercent,
        sales: product.sales,
      }))

      return {
        name: category.name,
        category: category.name,
        trend_direction: synced?.trendDirection ?? (category.growthRate > 0 ? 'up' : 'stable'),
        trend_strength: Number.isFinite(trendStrength) ? trendStrength : 0,
        last_analyzed_at: synced?.lastAnalyzedAt ?? null,
        topItems,
      }
    })

    const extraCategories = syncedCategories.filter((item) => !categories.some((category) => normalizeText(category.name) === normalizeText(item.category)))
    extraCategories.forEach((item) => {
      categories.push(buildCategoryPayload({
        name: item.category,
        trend_direction: item.trendDirection,
        trend_strength: item.trendStrength,
        lastAnalyzedAt: item.lastAnalyzedAt,
      }))
    })

    if (categories.length > 0) {
      return NextResponse.json({ categories, source: 'db' })
    }

    const dbCategories = await prisma.product.groupBy({
      by: ['category'],
      where: {
        category: { not: '' },
        status: 'active',
      },
      _count: { category: true },
      _avg: { profitMargin: true },
      _sum: { price: true },
      orderBy: { _count: { category: 'desc' } },
      take: 20,
    })

    if (dbCategories.length > 0) {
      const categories = await Promise.all(
        dbCategories.map(async (item) => {
          const topItems = await prisma.product.findMany({
            where: { category: item.category, status: 'active' },
            orderBy: { profitMargin: 'desc' },
            take: 5,
            select: {
              title: true,
              brand: true,
              price: true,
              profitMargin: true,
              analysisScore: true,
            },
          })

          const avgMargin = item._avg?.profitMargin ?? 0
          return {
            name: item.category,
            category: item.category,
            trend_direction: avgMargin > 35 ? 'up' : 'stable',
            trend_strength: avgMargin,
            last_analyzed_at: null,
            topItems: topItems.map((product) => ({
              title: product.title,
              brand: product.brand,
              price: product.price,
              demandScore: product.analysisScore,
              profitMargin: product.profitMargin,
              trendPercent: 0,
              sales: null,
            })),
          }
        })
      )

      return NextResponse.json({ categories, source: 'db' })
    }
  } catch (err) {
    console.error('top-categories db error:', err)
  }

  return NextResponse.json({ categories: [], source: 'db' })
}

