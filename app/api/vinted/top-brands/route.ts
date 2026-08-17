import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'
import { getTrendingBrands } from '@/vinted'
import { authorizeFeature } from '@/lib/access-control'

export async function GET(request: Request) {
  const access = await authorizeFeature(request, 'STARTER')
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

          return {
            brand: item.brand as string,
            category: topCategory[0]?.category ?? 'Divers',
            productCount: item._count.brand,
            totalSales: item._count.brand,
            averageDemandScore: Math.round(item._avg?.analysisScore ?? 0),
          }
        })
      )
      return NextResponse.json({ brands, source: 'db' })
    }
  } catch (err) {
    console.error('top-brands db error:', err)
  }

  return NextResponse.json({ brands: getTrendingBrands(20), source: 'fallback' })
}
