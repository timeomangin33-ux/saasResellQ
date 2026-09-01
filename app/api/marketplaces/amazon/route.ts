import { NextResponse } from 'next/server'
import { AmazonProvider, MarketplaceNonConfigure } from '@/src/providers/marketplaces/amazon.provider'
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
    const results = await AmazonProvider.searchListings(query)
    return NextResponse.json({ results, source: 'amazon-paapi', count: results.length })
  } catch (err) {
    if (err instanceof MarketplaceNonConfigure) {
      return NextResponse.json({ error: err.message, configured: false, results: [] }, { status: 501 })
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Recherche Amazon impossible.', results: [] },
      { status: 502 },
    )
  }
}
