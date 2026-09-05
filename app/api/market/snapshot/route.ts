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

        // Seul l'horodatage est écrit ici. Cette route recevait une liste de
        // noms de catégories et y ajoutait `trendDirection: 'stable'` et
        // `trendStrength: 'moderate'` en dur : deux constantes qui écrasaient
        // la tendance réellement calculée par lib/vinted/tendance.ts, laquelle
        // écrit « inconnue » tant qu'il n'y a pas assez d'historique. Une
        // catégorie jamais mesurée s'affichait donc « stable » à l'écran.
        await prisma.categoryMarket.upsert({
          where: { category: categoryName },
          update: {
            lastAnalyzedAt: new Date(),
          },
          create: {
            category: categoryName,
            lastAnalyzedAt: new Date(),
          },
        })
      })
    )

    // « stored » laissait croire que des mesures de marché avaient été
    // enregistrées, alors que seul `lastAnalyzedAt` est écrit. On décrit ce qui
    // s'est réellement passé.
    return NextResponse.json({
      ok: true,
      received: categories.length,
      categoriesTouched: categories.length,
      written: 'lastAnalyzedAt',
      message:
        `${categories.length} catégorie(s) horodatée(s). Aucune mesure de marché n'est écrite par cette route : ` +
        `les prix, volumes et tendances proviennent du collecteur.`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}
