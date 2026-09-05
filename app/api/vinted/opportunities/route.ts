import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import type { Prisma } from '@prisma/client'
import { authorizeFeature } from '@/lib/access-control'

export const dynamic = 'force-dynamic'

/**
 * Les opportunités : les annonces les mieux notées par le calcul de marché.
 *
 * Tout vient de la table `products`, alimentée par le collecteur. Rien n'est
 * estimé au moment de la requête : `analysisScore` et `profitMargin` sont
 * recalculés à chaque passage du robot contre la médiane réelle de la marque
 * dans la catégorie (voir `lib/vinted/scoring-marche.ts`).
 */
export async function GET(request: Request) {
  const access = await authorizeFeature(request, 'STARTER')
  if ('response' in access) return access.response

  const url = new URL(request.url)
  const margeMinimum = Number(url.searchParams.get('minProfit') ?? 0)
  const categorie = url.searchParams.get('category')?.trim() ?? ''
  const niveauRisque = url.searchParams.get('riskLevel') ?? ''
  const limite = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 40))

  const where: Prisma.ProductWhereInput = {
    status: 'active',
    // Une annonce sans note n'est pas une opportunité : c'est une annonce dont
    // on ne sait rien. La rendre ici la ferait passer pour un deal évalué.
    analysisScore: { not: null },
  }

  /**
   * `riskLevel` est un plancher de marge, jamais une tranche.
   *
   * Il découpait la marge en bandes fermées : « medium » valait
   * `gte 40, lt 60`. Le Deal Finder partant sur « medium » par défaut, le
   * premier clic écartait toutes les annonces au-dessus de 60 % de marge — les
   * meilleures trouvailles — et remontait au passage la marge minimale demandée
   * par l'utilisateur sans le lui dire. Un plafond n'a de toute façon aucun sens
   * ici : personne ne cherche à exclure une trop bonne affaire.
   *
   * On ne filtre pas non plus sur la colonne `riskLevel` des annonces : elle
   * n'est écrite que par la passe IA, donc nulle sur la quasi-totalité du stock,
   * et filtrer dessus ne renverrait presque rien.
   */
  const PLANCHERS_MARGE: Record<string, number> = { low: 0, medium: 40, high: 60 }
  const plancher = Math.max(margeMinimum, PLANCHERS_MARGE[niveauRisque] ?? 0)
  if (plancher > 0) where.profitMargin = { gte: plancher } satisfies Prisma.FloatNullableFilter

  if (categorie && categorie.toLowerCase() !== 'toutes') {
    where.OR = [
      { category: { equals: categorie, mode: 'insensitive' } },
      { brand: { equals: categorie, mode: 'insensitive' } },
    ]
  }

  const lignes = await prisma.product.findMany({
    where,
    orderBy: [{ analysisScore: 'desc' }, { profitMargin: 'desc' }],
    take: limite,
    select: {
      id: true,
      vintedId: true,
      title: true,
      brand: true,
      category: true,
      size: true,
      condition: true,
      price: true,
      totalPrice: true,
      profitMargin: true,
      analysisScore: true,
      riskLevel: true,
      favouriteCount: true,
      listedAt: true,
      lastSeenAt: true,
      url: true,
      imageUrl: true,
      seller: true,
    },
  })

  const maintenant = Date.now()

  const opportunities = lignes.map((p) => {
    const cout = p.totalPrice ?? p.price
    const marge = p.profitMargin ?? 0
    // Le gain en euros, pas seulement en pourcentage : c'est ce qu'on met dans
    // sa poche, et c'est ce qui décide vraiment d'un achat.
    const gainEstime = Math.round(cout * (marge / 100) * 100) / 100

    // Favoris par jour depuis la mise en ligne : le seul signal de demande que
    // Vinted nous donne. `null` quand la date manque — pas zéro, qui se lirait
    // comme « personne n'en veut ».
    const jours = p.listedAt ? Math.max(1, (maintenant - p.listedAt.getTime()) / 86_400_000) : null
    const favorisParJour =
      jours !== null && p.favouriteCount !== null ? Math.round((p.favouriteCount / jours) * 10) / 10 : null

    return {
      id: p.vintedId,
      title: p.title,
      brand: p.brand ?? 'Sans marque',
      category: p.category,
      size: p.size,
      condition: p.condition,
      price: p.price,
      totalPrice: cout,
      profitMargin: p.profitMargin,
      estimatedProfit: gainEstime,
      score: p.analysisScore,
      riskLevel: p.riskLevel,
      favouriteCount: p.favouriteCount,
      favouritesPerDay: favorisParJour,
      listedAt: p.listedAt,
      url: p.url,
      imageUrl: p.imageUrl,
      seller: p.seller,
    }
  })

  return NextResponse.json({
    opportunities,
    count: opportunities.length,
    source: 'collecte',
  })
}
