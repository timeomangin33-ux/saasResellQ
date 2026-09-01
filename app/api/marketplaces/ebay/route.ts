import { NextResponse } from 'next/server'
import { EbayProvider, MarketplaceNonConfigure } from '@/src/providers/marketplaces/ebay.provider'
import { authorizeFeature } from '@/lib/access-control'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const access = await authorizeFeature(request, 'STARTER')
  if ('response' in access) return access.response

  const url = new URL(request.url)
  const query = (url.searchParams.get('query') ?? '').trim()

  if (!query) {
    return NextResponse.json({ error: 'Le paramètre « query » est obligatoire.' }, { status: 400 })
  }

  try {
    const results = await EbayProvider.searchListings(query)
    return NextResponse.json({ results, source: 'ebay-browse-api', count: results.length })
  } catch (err) {
    if (err instanceof MarketplaceNonConfigure) {
      // 501 et non 200 : la fonctionnalité n'existe pas encore ici. Répondre
      // 200 avec des annonces inventées laissait croire le contraire.
      return NextResponse.json(
        { error: err.message, configured: false, results: [] },
        { status: 501 },
      )
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Recherche eBay impossible.', results: [] },
      { status: 502 },
    )
  }
}
