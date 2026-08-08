import { NextResponse } from 'next/server'
import { EbayProvider } from '@/src/providers/marketplaces/ebay.provider'
import { authorizeFeature } from '@/lib/access-control'

export async function GET(request: Request) {
  const access = await authorizeFeature('STARTER')
  if ('response' in access) return access.response

  const url = new URL(request.url)
  const query = url.searchParams.get('query') ?? ''

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 })
  }

  const results = await EbayProvider.searchListings(query)
  return NextResponse.json({ results })
}
