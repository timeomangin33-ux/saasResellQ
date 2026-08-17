import { NextResponse } from 'next/server'
import { AmazonProvider } from '@/src/providers/marketplaces/amazon.provider'
import { authorizeFeature } from '@/lib/access-control'

export async function GET(request: Request) {
  const access = await authorizeFeature(request, 'STARTER')
  if ('response' in access) return access.response

  const url = new URL(request.url)
  const query = url.searchParams.get('query') ?? ''

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 })
  }

  const results = await AmazonProvider.searchProducts(query)
  return NextResponse.json({ results })
}
