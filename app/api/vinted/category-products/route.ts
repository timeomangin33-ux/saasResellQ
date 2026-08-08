import { NextResponse } from 'next/server'
import { getProductsByCategory } from '@/vinted'
import { authorizeFeature } from '@/lib/access-control'

export async function GET(request: Request) {
  const access = await authorizeFeature('STARTER')
  if ('response' in access) return access.response

  const url = new URL(request.url)
  const category = url.searchParams.get('category') ?? ''
  const products = getProductsByCategory(category, 20)
  return NextResponse.json({ category, products, source: 'local' })
}

