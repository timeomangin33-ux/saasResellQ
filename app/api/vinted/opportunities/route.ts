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

  // Le « risque » se lit dans la marge : une marge énorme sur une seule marque
  // est plus fragile qu'une marge correcte et régulière.
  const marge: Prisma.FloatNullableFilter = {}
  if (niveauRisque === 'low') {
    if (margeMinimum > 0) marge.gte = margeMinimum
    marge.lt = 40
  } else if (niveauRisque === 'medium') {
    marge.gte = Math.max(margeMinimum, 40)
    marge.lt = 60
  } else if (niveauRisque === 'high') {
    marge.gte = Math.max(margeMinimum, 60)
  } else if (margeMinimum > 0) {
    marge.gte = margeMinimum
  }
  if (Object.keys(marge).length > 0) where.profitMargin = marge

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
