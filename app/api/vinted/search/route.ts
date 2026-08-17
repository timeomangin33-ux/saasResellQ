import { NextResponse } from 'next/server'
import { searchVintedItems } from '@/vinted'
import { authorizeFeature } from '@/lib/access-control'

export async function GET(request: Request) {
  const access = await authorizeFeature(request, 'STARTER')
  if ('response' in access) return access.response

  const url = new URL(request.url)
  const query = url.searchParams.get('query') ?? ''
  const category = url.searchParams.get('category') ?? undefined

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 })
  }

  const results = await searchVintedItems(query, category)
  return NextResponse.json({ results })
}
