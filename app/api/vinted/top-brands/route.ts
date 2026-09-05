import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { authorizeAuthenticatedUser } from '@/lib/access-control'

/**
 * Les marques les plus présentes dans les annonces collectées.
 *
 * La page /brands lisait sur ces lignes des champs que la route n'a jamais
 * renvoyés — `id`, `totalSales`, `sales`, `timesSold`, `demandScore`, `trend`,
 * `trendPercent` — et plantait. Trois de ces champs étaient de toute façon
 * impossibles : Vinted ne publie aucune transaction, donc aucun nombre de
 * ventes n'est mesurable. La route rend donc `id`, et uniquement des grandeurs
 * réellement mesurées sur les annonces : prix demandés, favoris, marge et
 * score calculés par le collecteur, et le nombre d'annonces qui ne sont plus
 * en vente (vendues ou retirées, Vinted ne dit pas laquelle).
 */
export async function GET(request: Request) {
  // Read-only aggregate market data: open to FREE accounts (see top-products).
  const access = await authorizeAuthenticatedUser(request)
  if ('response' in access) return access.response

  try {
    const agregats = await prisma.product.groupBy({
      by: ['brand'],
      where: { brand: { not: null }, status: 'active' },
      _count: { brand: true },
      _avg: { analysisScore: true, price: true, profitMargin: true },
      _min: { price: true },
      _max: { price: true, lastSeenAt: true },
      _sum: { favouriteCount: true },
      orderBy: { _count: { brand: 'desc' } },
      take: 20,
    })

    if (agregats.length === 0) {
      return NextResponse.json({
        brands: [],
        count: 0,
        source: 'collecte',
        message: "Aucune annonce n'a encore été collectée. Lancez le collecteur.",
      })
    }

    const noms = agregats.map((a) => a.brand as string)

    const [categoriesParMarque, plusEnVente] = await Promise.all([
      prisma.product.groupBy({
        by: ['brand', 'category'],
        where: { brand: { in: noms }, status: 'active' },
        _count: { category: true },
      }),
      // Annonces de la marque qui ne sont plus en vente : constaté par
      // relecture de la page, jamais déduit d'une vente supposée.
      prisma.product.groupBy({
        by: ['brand'],
        where: { brand: { in: noms }, status: { not: 'active' } },
        _count: { brand: true },
      }),
    ])

    const categoriePrincipale = new Map<string, { category: string; count: number }>()
    for (const ligne of categoriesParMarque) {
      const marque = ligne.brand as string
      const actuelle = categoriePrincipale.get(marque)
      if (!actuelle || ligne._count.category > actuelle.count) {
        categoriePrincipale.set(marque, { category: ligne.category, count: ligne._count.category })
      }
    }

    const disparues = new Map(plusEnVente.map((l) => [l.brand as string, l._count.brand]))

    const brands = agregats.map((item) => {
      const marque = item.brand as string
      const score = item._avg?.analysisScore
      const marge = item._avg?.profitMargin
      return {
        // La page a besoin d'une clé stable et d'un paramètre de lien : le nom
        // de la marque est l'identifiant naturel ici, il n'y a pas de table
        // « marques » en base.
        id: marque,
        brand: marque,
        category: categoriePrincipale.get(marque)?.category ?? 'Divers',
        productCount: item._count.brand,
        // Prix demandés, jamais prix de vente : Vinted ne publie pas les
        // transactions.
        avgPrice: item._avg?.price ?? null,
        minPrice: item._min?.price ?? null,
        maxPrice: item._max?.price ?? null,
        avgProfitMargin: typeof marge === 'number' ? Math.round(marge * 10) / 10 : null,
        // Null plutôt que 0 quand la passe de scoring n'a pas tourné : un score
        // de 0 se lit « marque catastrophique », ce qui est une autre affirmation
        // que « pas encore noté ».
        averageDemandScore: typeof score === 'number' ? Math.round(score) : null,
        totalFavourites: item._sum?.favouriteCount ?? null,
        // Annonces de la marque qui ne sont plus en vente (vendues OU retirées).
        noLongerListedCount: disparues.get(marque) ?? 0,
        lastSeenAt: item._max?.lastSeenAt ?? null,
      }
    })

    return NextResponse.json({
      brands,
      count: brands.length,
      source: 'collecte',
      lecture:
        'Prix demandés sur les annonces actives collectées, jamais prix de vente : ' +
        'Vinted ne publie aucune transaction. « noLongerListedCount » compte les annonces ' +
        "qui ne sont plus en vente, sans distinguer une vente d'un retrait.",
    })
  } catch (err) {
    console.error('top-brands db error:', err)
    return NextResponse.json(
      { error: 'Impossible de charger les marques.', cause: 'database' },
      { status: 503 },
    )
  }
}
