import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
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
      { analysisScore: { sort: 'desc', nulls: 'last' } },
      { profitMargin: { sort: 'desc', nulls: 'last' } },
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

  // No simulated fallback: an empty scrape must read as empty, not as
  // invented products. getTopProducts() in vinted.ts pads its output with
  // generatePlaceholderProducts(), so the old fallback shipped fabricated
  // titles, prices and margins whenever the table was empty.
  return NextResponse.json({ products })
}

