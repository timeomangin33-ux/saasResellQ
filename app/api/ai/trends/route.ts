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

/** Ordre d'affichage : ce dont on peut répondre passe devant. */
function rangDeConfiance(confiance: string) {
  return confiance === 'confirme' ? 0 : confiance === 'en-mesure' ? 1 : 2
}

export async function POST(request: Request) {
  const access = await authorizeFeature(request, 'PRO')
  if ('response' in access) return access.response

  const body = (await request.json().catch(() => ({}))) as { period?: string }
  const jours = FENETRES[body.period ?? '7d'] ?? 7
  const debutFenetre = new Date(Date.now() - jours * 86_400_000)

  const marches = await prisma.categoryMarket.findMany({
    // Postgres place les NULL en tête sur un ORDER BY ... DESC, et Prisma émet
    // un ORDER BY nu : les catégories dont le volume n'a jamais été mesuré
    // occupaient les premières lignes du tableau des tendances.
    orderBy: { volumeActive: { sort: 'desc', nulls: 'last' } },
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
      const d = demandeParCategorie.get(marche.category)
      const indiceDemande =
        d && d.annonces > 0 ? Math.round(Math.min(100, (d.favoris / d.annonces) * 20)) : null

      // La variation vient du calcul stabilisé écrit par le collecteur, pas
      // d'une soustraction refaite ici entre le premier et le dernier point de
      // la fenêtre. C'est le même écart-mesuré-sur-fenêtres, avec sa zone
      // morte, que celui qui sert à décider de la flèche : deux calculs
      // différents pour une même notion, c'est la garantie que l'un des deux
      // contredira l'autre à l'écran.
      return {
        category: marche.category,
        priceChange: marche.priceChangePercent,
        trendDirection: marche.trendDirection ?? 'inconnue',
        volume: marche.volumeActive ?? 0,
        demandIndex: indiceDemande,
        avgPrice: marche.avgPrice,
        medianPrice: marche.medianPrice,
        p25Price: marche.p25Price,
        p75Price: marche.p75Price,
        priceSample: marche.priceSample,
        // Rotation vérifiée : part des annonces dont la page, relue sept jours
        // après la première vue, n'était plus une annonce en vente. Vendue ou
        // retirée ; Vinted ne publie pas les transactions, donc jamais « vendue ».
        sellThroughRate: marche.sellThroughRate,
        sellThroughSample: marche.sellThroughSample,
        medianDaysToDisappear: marche.medianDaysToDisappear,
        // De combien de jours d'historique vient la variation : trois jours ne
        // font pas une tendance, et le lecteur doit pouvoir en juger.
        historyPoints: points.length,
        historyDays: marche.historyDays,
        confidence: marche.confidence ?? 'insuffisant',
        publishable: marche.publishable,
        qualityNote: marche.qualityNote,
        lastSweepAt: marche.lastSweepAt,
        lastAnalyzedAt: marche.lastAnalyzedAt,
      }
    })
    // Les catégories dont on peut répondre de la mesure d'abord ; à l'intérieur
    // de chaque groupe, la plus forte variation. Une catégorie sans historique
    // ne doit pas se retrouver en tête du tableau juste parce que son chiffre
    // est bruyant.
    .sort((a, b) => {
      if (rangDeConfiance(a.confidence) !== rangDeConfiance(b.confidence)) {
        return rangDeConfiance(a.confidence) - rangDeConfiance(b.confidence)
      }
      return (b.priceChange ?? -999) - (a.priceChange ?? -999)
    })

  return NextResponse.json({
    trends,
    period: body.period ?? '7d',
    source: 'collecte',
    // Ce que le tableau montre et ce qu'il ne montre pas, en une phrase
    // reprise telle quelle par l'interface.
    lecture:
      'Prix demandés sur les annonces récentes, jamais prix de vente : Vinted ne publie aucune transaction. ' +
      'La rotation est vérifiée annonce par annonce : part de celles qui ne sont plus en vente ' +
      'sept jours après leur première vue (vendues ou retirées, Vinted ne dit pas laquelle).',
  })
}
