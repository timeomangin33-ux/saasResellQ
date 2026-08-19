import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { authorizeAuthenticatedUser } from '@/lib/access-control'

/**
 * Products for one brand, straight from the scraper's own rows.
 * Previously filtered TRENDING_ITEMS from vinted.ts - the hardcoded
 * "Top ventes simulées" list - and reported invented sales counts.
 */
export async function GET(request: Request) {
  // Read-only aggregate market data: open to FREE accounts (see top-products).
  const access = await authorizeAuthenticatedUser(request)
  if ('response' in access) return access.response

  const url = new URL(request.url)
  const brand = url.searchParams.get('brand')?.trim() ?? ''

  if (!brand) {
    return NextResponse.json({ error: 'Le paramètre brand est requis.' }, { status: 400 })
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        status: 'active',
        brand: { equals: brand, mode: 'insensitive' },
      },
      orderBy: [
        { analysisScore: { sort: 'desc', nulls: 'last' } },
        { price: 'desc' },
      ],
      take: 20,
      select: {
        title: true,
        brand: true,
        price: true,
        size: true,
        condition: true,
        category: true,
        url: true,
        imageUrl: true,
        profitMargin: true,
        analysisScore: true,
      },
    })

    return NextResponse.json({ brand, products })
  } catch (err) {
    console.error('brand-products db error:', err)
    return NextResponse.json({ error: 'Impossible de charger les produits.' }, { status: 500 })
  }
}
