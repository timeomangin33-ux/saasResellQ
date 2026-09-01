import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { authorizeFeature } from '@/lib/access-control'

export const dynamic = 'force-dynamic'

/**
 * Les tendances par catégorie, mesurées.
 *
 * Cette route appelait un agent n8n (`trendAnalyzer`) qui n'est pas déployé :
 * elle répondait 503 à chaque chargement de la page Insights, qui restait donc
 * vide en permanence. Or la tendance d'une catégorie n'a besoin d'aucun
 * modèle : le robot enregistre chaque jour le prix moyen, le prix médian et le
 * volume dans `CategoryMarketDaily`. Comparer deux points de cette table, c'est
 * exactement ce qu'on cherchait à faire deviner.
 *
 * Elle ne consomme donc plus de crédits IA — d'où `authorizeFeature` et non
 * `authorizeAIFeature` : facturer une analyse qui est une soustraction serait
 * malhonnête.
 */

const FENETRES: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 }

export async function POST(request: Request) {
  const access = await authorizeFeature(request, 'PRO')
  if ('response' in access) return access.response

  const body = (await request.json().catch(() => ({}))) as { period?: string }
  const jours = FENETRES[body.period ?? '7d'] ?? 7
  const debutFenetre = new Date(Date.now() - jours * 86_400_000)

  const marches = await prisma.categoryMarket.findMany({
    orderBy: { volumeActive: 'desc' },
    take: 30,
  })

  if (marches.length === 0) {
    return NextResponse.json({
      trends: [],
      period: body.period ?? '7d',
      message: "Aucune catégorie n'a encore été analysée. Lancez le collecteur.",
    })
  }

  const categories = marches.map((m) => m.category)

  const [historique, demande] = await Promise.all([
    prisma.categoryMarketDaily.findMany({
      where: { category: { in: categories }, day: { gte: debutFenetre } },
      orderBy: { day: 'asc' },
      select: { category: true, day: true, avgPrice: true, volumeActive: true },
    }),
    // Part des annonces actives qui ont au moins un favori : le seul signal de
    // demande que Vinted publie, et il est réel. L'ancien « indice de demande »
    // était un nombre inventé par un modèle.
    prisma.product.groupBy({
      by: ['category'],
      where: { category: { in: categories }, status: 'active' },
      _count: { _all: true },
      _sum: { favouriteCount: true },
    }),
  ])

  const parCategorie = new Map<string, { avgPrice: number | null; volume: number | null; day: Date }[]>()
  for (const point of historique) {
    const liste = parCategorie.get(point.category) ?? []
    liste.push({ avgPrice: point.avgPrice, volume: point.volumeActive, day: point.day })
    parCategorie.set(point.category, liste)
  }

  const demandeParCategorie = new Map(
    demande.map((d) => [d.category, { annonces: d._count._all, favoris: d._sum.favouriteCount ?? 0 }]),
  )

  const trends = marches
    .map((marche) => {
      const points = parCategorie.get(marche.category) ?? []
      const premier = points.find((p) => p.avgPrice !== null)
      const dernier = [...points].reverse().find((p) => p.avgPrice !== null)

      // Sans deux points, il n'y a pas de tendance. On rend `null`, que
      // l'interface affiche comme « pas assez d'historique » — pas 0 %, qui se
      // lirait « stable ».
      const variationPrix =
        premier && dernier && premier.avgPrice && premier.avgPrice > 0 && premier !== dernier
          ? Math.round(((dernier.avgPrice! - premier.avgPrice) / premier.avgPrice) * 1000) / 10
          : null

      const d = demandeParCategorie.get(marche.category)
      const indiceDemande =
        d && d.annonces > 0 ? Math.round(Math.min(100, (d.favoris / d.annonces) * 20)) : null

      return {
        category: marche.category,
        priceChange: variationPrix,
        volume: marche.volumeActive ?? 0,
        demandIndex: indiceDemande,
        avgPrice: marche.avgPrice,
        medianPrice: marche.medianPrice,
        // De combien de jours d'historique vient la variation : trois jours ne
        // font pas une tendance, et le lecteur doit pouvoir en juger.
        historyPoints: points.length,
        lastAnalyzedAt: marche.lastAnalyzedAt,
      }
    })
    .sort((a, b) => (b.priceChange ?? -999) - (a.priceChange ?? -999))

  return NextResponse.json({ trends, period: body.period ?? '7d', source: 'collecte' })
}
