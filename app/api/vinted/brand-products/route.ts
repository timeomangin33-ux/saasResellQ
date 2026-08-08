import { NextResponse } from 'next/server'
import { TRENDING_ITEMS } from '@/vinted'
import { authorizeFeature } from '@/lib/access-control'

export async function GET(request: Request) {
  const access = await authorizeFeature('STARTER')
  if ('response' in access) return access.response

  const url = new URL(request.url)
  const brand = url.searchParams.get('brand') ?? ''

  if (!brand) {
    return NextResponse.json({ error: 'Brand parameter required' }, { status: 400 })
  }

  const normalizedBrand = brand.trim().toLowerCase()
  const products = TRENDING_ITEMS
    .filter((item) => item.brand.toLowerCase() === normalizedBrand)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 20)

  return NextResponse.json({ brand, products })
}
