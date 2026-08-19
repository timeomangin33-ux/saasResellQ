import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { VINTED_CATEGORIES } from '@/vinted'
import { authorizeAuthenticatedUser } from '@/lib/access-control'

/**
 * Products for one category, straight from the scraper's own rows.
 * Previously served getProductsByCategory() from vinted.ts, i.e. the
 * hardcoded "Top ventes simulées" list, and labelled the result
 * `source: 'local'`.
 */
export async function GET(request: Request) {
  // Read-only aggregate market data: open to FREE accounts (see top-products).
  const access = await authorizeAuthenticatedUser(request)
  if ('response' in access) return access.response

  const url = new URL(request.url)
  const requested = url.searchParams.get('category')?.trim() ?? ''

  if (!requested) {
    return NextResponse.json({ error: 'Le paramètre category est requis.' }, { status: 400 })
  }

  // Callers pass either the display name ("Femmes") or the URL slug
  // ("femmes"); products are stored under the display name. VINTED_CATEGORIES
  // is used here purely as the slug-to-name map, not for its stats fields.
  const bySlug = VINTED_CATEGORIES.find((item) => item.slug === requested.toLowerCase())
  const category = bySlug?.name ?? requested

  try {
    const products = await prisma.product.findMany({
      where: {
        status: 'active',
        category: { equals: category, mode: 'insensitive' },
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
        url: true,
        imageUrl: true,
        profitMargin: true,
        analysisScore: true,
      },
    })

    return NextResponse.json({ category, products })
  } catch (err) {
    console.error('category-products db error:', err)
    return NextResponse.json({ error: 'Impossible de charger les produits.' }, { status: 500 })
  }
}
