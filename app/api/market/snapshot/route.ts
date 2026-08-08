import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { requireInternalAccess } from '@/lib/access-control'

function normalizeCategoryName(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function extractCategories(payload: any): Array<{ name: string; avgTrendScore?: number }> {
  const allCategories = Array.isArray(payload?.all_categories) ? payload.all_categories : []
  const direct = Array.isArray(payload?.top_categories) ? payload.top_categories : []
  if (allCategories.length > 0) {
    return allCategories
      .map((item: any) => {
        if (typeof item === 'string') {
          return { name: item }
        }
        if (item && typeof item === 'object') {
          const name = normalizeCategoryName(item.name ?? item.category)
          if (!name) return null
          return {
            name,
            avgTrendScore: typeof item.avg_trend_score === 'number' ? item.avg_trend_score : undefined,
          }
        }
        return null
      })
      .filter(Boolean) as Array<{ name: string; avgTrendScore?: number }>
  }
  if (direct.length > 0) {
    return direct
      .map((item: any) => {
        if (typeof item === 'string') {
          return { name: item }
        }
        if (item && typeof item === 'object') {
          const name = normalizeCategoryName(item.name ?? item.category)
          if (!name) return null
          return {
            name,
            avgTrendScore: typeof item.avg_trend_score === 'number' ? item.avg_trend_score : undefined,
          }
        }
        return null
      })
      .filter(Boolean) as Array<{ name: string; avgTrendScore?: number }>
  }

  const fallback = Array.isArray(payload?.categories) ? payload.categories : []
  return fallback
    .map((item: any) => {
      if (typeof item === 'string') return { name: item }
      if (item && typeof item === 'object') {
        const name = normalizeCategoryName(item.name ?? item.category)
        if (!name) return null
        return { name }
      }
      return null
    })
    .filter(Boolean) as Array<{ name: string; avgTrendScore?: number }>
}

export async function POST(request: Request) {
  const access = requireInternalAccess(request)
  if ('response' in access) return access.response

  try {
    const payload = await request.json().catch(() => null)
    const categories = extractCategories(payload)

    if (categories.length === 0) {
      return NextResponse.json({ ok: false, message: 'No categories provided' }, { status: 400 })
    }

    await Promise.all(
      categories.map(async (category) => {
        const categoryName = normalizeCategoryName(category.name)
        if (!categoryName) return

        await prisma.categoryMarket.upsert({
          where: { category: categoryName },
          update: {
            lastAnalyzedAt: new Date(),
            trendDirection: 'stable',
            trendStrength: 'moderate',
          },
          create: {
            category: categoryName,
            lastAnalyzedAt: new Date(),
            trendDirection: 'stable',
            trendStrength: 'moderate',
          },
        })
      })
    )

    return NextResponse.json({ ok: true, received: categories.length, stored: categories.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}
