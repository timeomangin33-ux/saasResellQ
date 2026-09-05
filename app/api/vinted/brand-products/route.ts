import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { authorizeAuthenticatedUser } from '@/lib/access-control'

/**
 * Les annonces d'une marque, telles que le collecteur les a enregistrées.
 *
 * Cette route filtrait auparavant TRENDING_ITEMS de vinted.ts — la liste
 * « Top ventes simulées » écrite en dur — et rendait des nombres de ventes
 * inventés. La page /brands lisait par ailleurs `id`, `sales` et `timesSold`
 * sur ces lignes, que la version base de données ne renvoyait pas : d'où le
 * plantage. `id` est maintenant rendu ; aucun compteur de ventes ne l'est,
 * puisque Vinted ne publie pas les transactions.
 */
export async function GET(request: Request) {
  // Read-only aggregate market data: open to FREE accounts (see top-products).
  const access = await authorizeAuthenticatedUser(request)
  if ('response' in access) return access.response

  const url = new URL(request.url)
  const brand = url.searchParams.get('brand')?.trim() ?? ''
  const limite = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20))

  if (!brand) {
    return NextResponse.json({ error: 'Le paramètre brand est requis.' }, { status: 400 })
  }

  try {
    const lignes = await prisma.product.findMany({
      where: {
        status: 'active',
        brand: { equals: brand, mode: 'insensitive' },
      },
      // Postgres place les NULL en tête sur un ORDER BY ... DESC : sans
      // « nulls: last », les annonces jamais notées ouvraient la liste.
      orderBy: [
        { analysisScore: { sort: 'desc', nulls: 'last' } },
        { price: 'desc' },
      ],
      take: limite,
      select: {
        id: true,
        vintedId: true,
        title: true,
        brand: true,
        price: true,
        totalPrice: true,
        size: true,
        condition: true,
        category: true,
        url: true,
        imageUrl: true,
        profitMargin: true,
        analysisScore: true,
        riskLevel: true,
        favouriteCount: true,
        listedAt: true,
        lastSeenAt: true,
        status: true,
        finalState: true,
      },
    })

    return NextResponse.json({
      brand,
      products: lignes,
      count: lignes.length,
      source: 'collecte',
      lecture:
        'Prix demandés sur les annonces en ligne, jamais prix de vente : ' +
        "Vinted ne publie aucune transaction. « finalState » indique l'état lu " +
        "sur la page de l'annonce lors de la dernière vérification.",
    })
  } catch (err) {
    console.error('brand-products db error:', err)
    return NextResponse.json(
      { error: 'Impossible de charger les produits.', cause: 'database' },
      { status: 503 },
    )
  }
}
