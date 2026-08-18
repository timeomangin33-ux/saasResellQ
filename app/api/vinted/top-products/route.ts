import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { getTopProducts } from '@/vinted'
import { authorizeAuthenticatedUser } from '@/lib/access-control'

export async function GET(request: Request) {
  // Aggregate market data served from our own DB: readable by any signed-in
  // account, including FREE. This is the read-only tier the landing page
  // promises ("commencer gratuitement") - acting on it still needs a plan.
  const access = await authorizeAuthenticatedUser(request)
  if ('response' in access) return access.response

  const products = await prisma.product.findMany({
    where: { status: 'active' },
    orderBy: [
      { analysisScore: 'desc' },
      { profitMargin: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 20,
    select: {
      title: true,
      brand: true,
      price: true,
      url: true,
      imageUrl: true,
      profitMargin: true,
      analysisScore: true,
      riskLevel: true,
      category: true,
      seller: true,
    },
  })

  if (products.length > 0) {
    return NextResponse.json({ products, source: 'db' })
  }

  const fallbackProducts = getTopProducts(20).map((product) => ({
    title: product.title,
    brand: product.brand,
    price: product.price,
    url: product.url ?? '#',
    imageUrl: product.image,
    profitMargin: product.profitMargin,
    analysisScore: product.demandScore,
    riskLevel: undefined,
    category: product.category,
    seller: product.seller ?? 'Vendeur Vinted',
  }))

  return NextResponse.json({ products: fallbackProducts, source: 'fallback' })
}

