import { NextResponse } from 'next/server'
import { prisma } from '@/prisma'

export const revalidate = 300

export async function GET() {
  try {
    const [productsTracked, categoriesTracked] = await Promise.all([
      prisma.product.count({ where: { status: 'active' } }),
      prisma.categoryMarket.count(),
    ])

    return NextResponse.json({ productsTracked, categoriesTracked })
  } catch {
    return NextResponse.json({ productsTracked: 0, categoriesTracked: 0 })
  }
}
