import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { authorizeAuthenticatedUser } from '@/lib/access-control'

export async function GET(request: Request) {
  // Read-only aggregate market data: open to FREE accounts (see top-products).
  const access = await authorizeAuthenticatedUser(request)
  if ('response' in access) return access.response

  try {
    const dbBrands = await prisma.product.groupBy({
      by: ['brand'],
      where: { brand: { not: null }, status: 'active' },
      _count: { brand: true },
      _avg: { analysisScore: true },
      orderBy: { _count: { brand: 'desc' } },
      take: 20,
    })

    if (dbBrands.length > 0) {
      const brands = await Promise.all(
        dbBrands.map(async (item) => {
          const topCategory = await prisma.product.groupBy({
            by: ['category'],
            where: { brand: item.brand, status: 'active' },
            _count: { category: true },
            orderBy: { _count: { category: 'desc' } },
            take: 1,
          })

          const score = item._avg?.analysisScore
          return {
            brand: item.brand as string,
            category: topCategory[0]?.category ?? 'Divers',
            productCount: item._count.brand,
            // Null rather than 0 when the AI scoring pass hasn't run: a score
            // of 0 reads as "terrible brand", which is a different claim from
            // "not scored yet".
            averageDemandScore: typeof score === 'number' ? Math.round(score) : null,
          }
        })
      )
      return NextResponse.json({ brands })
    }

    return NextResponse.json({ brands: [] })
  } catch (err) {
    console.error('top-brands db error:', err)
    return NextResponse.json({ error: 'Impossible de charger les marques.' }, { status: 500 })
  }
}
