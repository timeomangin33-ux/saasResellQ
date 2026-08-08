import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { authorizeFeature } from '@/lib/access-control'

export async function GET(request: Request) {
  const access = await authorizeFeature('STARTER')
  if ('response' in access) return access.response

  const url = new URL(request.url)
  const minProfit = Number(url.searchParams.get('minProfit') ?? 0)
  const category = url.searchParams.get('category')?.trim() ?? ''
  const riskLevel = url.searchParams.get('riskLevel') ?? ''

  const where: any = { status: 'active' }
  const profitCondition: any = {}

  if (riskLevel === 'low') {
    if (minProfit > 0) profitCondition.gte = minProfit
    profitCondition.lt = 40
  } else if (riskLevel === 'medium') {
    profitCondition.gte = Math.max(minProfit, 40)
    profitCondition.lt = 60
  } else if (riskLevel === 'high') {
    profitCondition.gte = Math.max(minProfit, 60)
  } else if (minProfit > 0) {
    profitCondition.gte = minProfit
  }

  if (Object.keys(profitCondition).length > 0) {
    where.profitMargin = profitCondition
  }

  if (category) {
    where.OR = [
      { category: { equals: category, mode: 'insensitive' } },
      { brand: { equals: category, mode: 'insensitive' } },
    ]
  }

  const opportunities = await prisma.product.findMany({
    where,
    orderBy: [
      { profitMargin: 'desc' },
      { analysisScore: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 40,
    select: {
      id: true,
      title: true,
      brand: true,
      category: true,
      price: true,
      profitMargin: true,
      analysisScore: true,
      riskLevel: true,
      url: true,
      seller: true,
    },
  })

  return NextResponse.json({ opportunities, source: 'db' })
}

