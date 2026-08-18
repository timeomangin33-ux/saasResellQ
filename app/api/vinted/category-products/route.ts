import { NextResponse } from 'next/server'
import { getProductsByCategory } from '@/vinted'
import { authorizeAuthenticatedUser } from '@/lib/access-control'

export async function GET(request: Request) {
  // Read-only aggregate market data: open to FREE accounts (see top-products).
  const access = await authorizeAuthenticatedUser(request)
  if ('response' in access) return access.response

  const url = new URL(request.url)
  const category = url.searchParams.get('category') ?? ''
  const products = getProductsByCategory(category, 20)
  return NextResponse.json({ category, products, source: 'local' })
}

