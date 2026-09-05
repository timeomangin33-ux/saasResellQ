import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { AGENTS, callAgent } from '@/lib/n8n-agents'
import { VINTED_CATEGORIES } from '@/vinted'
import { authorizeAIFeature, rembourserCredits } from '@/lib/access-control'

export const dynamic = 'force-dynamic'

/**
 * Analyse d'une catégorie.
 *
 * Quand l'agent n8n n'est pas joignable, cette route rendait une analyse
 * « locale » entièrement composée de constantes : prix moyen 49 €, score de
 * demande 70, croissance 18 %, marques « Nike, Zara, H&M, Adidas », et une
 * conclusion écrite d'avance (« devrait conserver une dynamique stable »). Ces
 * chiffres ne venaient d'aucune mesure et ne changeaient jamais, quelle que
 * soit la catégorie demandée.
 *
 * Le repli lit désormais les tables que le robot alimente. Quand elles n'ont
 * rien sur la catégorie, la route le dit au lieu de combler le vide.
 */

export async function POST(request: Request) {
  const access = await authorizeAIFeature(request, 'category_analysis', 2, 'PRO')
  if ('response' in access) return access.response

  const body = await request.json().catch(() => ({}))
  const category = typeof body.category === 'string' ? body.category : ''

  try {
    const data = await callAgent(AGENTS.categoryAnalyzer, { category })

    if (estUnRepli(data)) {
      // Les 2 crédits sont débités avant l'appel à l'agent. Quand l'agent
      // n'est pas joignable, la réponse rendue est une relecture des tables du
      // collecteur : aucune analyse IA n'a été produite, donc rien à facturer.
      await rembourserCredits(access.user.id, 2, 'category_analysis')
      return repondreAvecLesDonneesCollectees(category)
    }

    return NextResponse.json({ ...(data as object), usage: access.usage })
  } catch (error) {
    await rembourserCredits(access.user.id, 2, 'category_analysis')
    const reponse = await repondreAvecLesDonneesCollectees(category)
    console.error("ai/categories: agent injoignable, repli sur les données collectées", error)
    return reponse
  }
}

function estUnRepli(data: unknown): data is { fallback?: boolean } {
  return typeof data === 'object' && data !== null && (data as { fallback?: boolean }).fallback === true
}

function sansAccents(texte: string) {
  return texte.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

/** Résout un slug ou un nom affiché vers le nom sous lequel les annonces sont rangées. */
function resoudreCategorie(demande: string) {
  const normalise = sansAccents(demande)
  const trouvee = VINTED_CATEGORIES.find(
    (c) => sansAccents(c.slug) === normalise || sansAccents(c.name) === normalise,
  )
  return trouvee?.name ?? demande
}

async function repondreAvecLesDonneesCollectees(demande: string) {
  const categorie = resoudreCategorie(demande)

  if (!categorie) {
    return NextResponse.json({ error: 'Aucune catégorie fournie.' }, { status: 400 })
  }

  const [marche, historique, marques] = await Promise.all([
    prisma.categoryMarket.findUnique({ where: { category: categorie } }),
    prisma.categoryMarketDaily.findMany({
      where: { category: categorie },
      orderBy: { day: 'desc' },
      take: 30,
    }),
    prisma.product.groupBy({
      by: ['brand'],
      where: { category: categorie, status: 'active', brand: { not: null } },
      _count: { brand: true },
      _avg: { price: true },
      orderBy: { _count: { brand: 'desc' } },
      take: 5,
    }),
  ])

  // Rien de collecté sur cette catégorie : on le dit. C'est une information
  // utile — elle signifie « ajoutez-la à la file de collecte », pas « le
  // marché est calme ».
  if (!marche || (marche.volumeActive ?? 0) === 0) {
    return NextResponse.json(
      {
        source: 'collecte',
        analysis: null,
        error:
          `Aucune annonce n'a encore été collectée pour « ${categorie} ». ` +
          `Ajoutez-la à la file de collecte pour que le robot commence à la suivre.`,
      },
      { status: 404 },
    )
  }

  // La tendance sur trente jours vaut mieux que l'écart avec le passage
  // précédent : elle ne bouge pas parce qu'un passage a ramené deux annonces
  // de moins.
  const ancien = historique.at(-1)
  const recent = historique[0]
  const croissance =
    ancien?.avgPrice && recent?.avgPrice && ancien.avgPrice > 0
      ? ((recent.avgPrice - ancien.avgPrice) / ancien.avgPrice) * 100
      : null

  return NextResponse.json({
    source: 'collecte',
    analysis: {
      category: categorie,
      avgPrice: marche.avgPrice,
      medianPrice: marche.medianPrice,
      volumeActive: marche.volumeActive,
      trendDirection: marche.trendDirection,
      priceChangePercent: marche.priceChangePercent,
      volumeChangePercent: marche.volumeChangePercent,
      growthRate30d: croissance,
      topBrands: marques.map((m) => ({
        brand: m.brand,
        listings: m._count.brand,
        avgPrice: m._avg.price,
      })),
      lastAnalyzedAt: marche.lastAnalyzedAt,
      // Le nombre de points d'historique dit au lecteur quelle confiance
      // accorder à la tendance : trois jours ne font pas une courbe.
      historyPoints: historique.length,
    },
  })
}
