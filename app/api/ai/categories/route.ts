import { NextResponse } from 'next/server'
import { AGENTS, callAgent } from '@/lib/n8n-agents'
import { VINTED_CATEGORIES } from '@/vinted'
import { authorizeAIFeature } from '@/lib/access-control'

export async function POST(request: Request) {
  const access = await authorizeAIFeature('category_analysis', 2, 'PRO')
  if ('response' in access) return access.response
  const body = await request.json().catch(() => ({}))
  const category = typeof body.category === 'string' ? body.category : ''

  try {
    const data = await callAgent(AGENTS.categoryAnalyzer, { category })

    if (isFallbackResponse(data)) {
      return NextResponse.json({ analysis: buildLocalCategoryAnalysis(category), source: 'local', fallback: true })
    }

    return NextResponse.json({ ...data as object, usage: access.usage })
  } catch (error) {
    return NextResponse.json(
      {
        analysis: buildLocalCategoryAnalysis(category),
        source: 'local',
        fallback: true,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    )
  }
}

function isFallbackResponse(data: unknown): data is { fallback?: boolean } {
  return typeof data === 'object' && data !== null && (data as any).fallback === true
}

function normalizeText(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

function buildLocalCategoryAnalysis(categoryName: string) {
  const normalized = normalizeText(categoryName)
  const matched = VINTED_CATEGORIES.find((item) =>
    normalizeText(item.slug) === normalized || normalizeText(item.name) === normalized
  )

  const category = matched?.name || categoryName || 'Catégorie inconnue'
  const avgPrice = matched?.averagePrice || 49
  const demandScore = matched?.demandScore || 70
  const growthRate = matched?.growthRate || 18
  const topBrands = matched?.topBrands.length ? matched.topBrands.slice(0, 5) : ['Nike', 'Zara', 'H&M', 'Adidas']
  const saturation = Math.max(15, Math.min(85, 100 - demandScore))

  return {
    category,
    avgPrice,
    topBrands,
    demandScore,
    growthRate,
    saturation,
    recommendation: `La catégorie ${category} reste intéressante sur le marché. Concentre-toi sur les meilleures marques et les articles à forte demande.`,
    opportunities: [
      `Produits de marque à marge supérieure`,
      `Articles tendance renouvelés rapidement`,
      `Lots de vêtements vintage`,
    ],
    predictions: `La catégorie ${category} devrait conserver une dynamique stable sur les prochaines semaines, avec une bonne chance de trouver des deals rentables.`,
  }
}
