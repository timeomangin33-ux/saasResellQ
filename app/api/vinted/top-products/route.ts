import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { getTopProducts } from '@/vinted'
import { authorizeFeature } from '@/lib/access-control'

export async function GET(request: Request) {
  const access = await authorizeFeature(request, 'STARTER')
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

