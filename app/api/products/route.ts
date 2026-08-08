import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { authorizeFeature } from '@/lib/access-control'

/**
 * GET /api/products - List products with filters
 */
export async function GET(request: NextRequest) {
  const access = await authorizeFeature('STARTER')
  if ('response' in access) return access.response

  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const minMargin = searchParams.get('minMargin')
    const maxRisk = searchParams.get('maxRisk')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status') || 'active'

    const products = await prisma.product.findMany({
      where: {
        ...(category && { category }),
        ...(minMargin && { profitMargin: { gte: parseFloat(minMargin) } }),
        ...(maxRisk && { riskLevel: { in: getRiskLevels(maxRisk) } }),
        status,
      },
      orderBy: { profitMargin: 'desc' },
      take: limit,
    })

    return NextResponse.json({
      count: products.length,
      products,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/products - Create/update product
 */
export async function POST(request: NextRequest) {
  const access = await authorizeFeature('PRO')
  if ('response' in access) return access.response

  try {
    const body = await request.json().catch(() => ({}))

    const { vintedId, ...data } = body

    if (!vintedId) {
      return NextResponse.json({ error: 'vintedId required' }, { status: 400 })
    }

    const product = await prisma.product.upsert({
      where: { vintedId },
      update: {
        ...data,
        updatedAt: new Date(),
      },
      create: {
        vintedId,
        ...data,
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    )
  }
}

/**
 * Helper: Get risk levels based on max level
 */
function getRiskLevels(maxRisk: string): string[] {
  const levels: Record<string, string[]> = {
    low: ['low'],
    medium: ['low', 'medium'],
    high: ['low', 'medium', 'high'],
  }
  return levels[maxRisk] || ['low', 'medium', 'high']
}
