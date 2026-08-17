import { NextResponse } from 'next/server'
import { authorizeFeature } from '@/lib/access-control'
import { prisma } from '@/prisma'

export async function GET(request: Request) {
  const access = await authorizeFeature(request, 'BUSINESS')
  if ('response' in access) return access.response

  const user = access.user

  const accounts = await prisma.vintedAccount.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' } })

  const withStats = await Promise.all(
    accounts.map(async (account) => {
      const [activeListings, sales] = await Promise.all([
        prisma.vintedListing.count({ where: { accountId: account.id, sold: false } }),
        prisma.vintedSale.aggregate({ where: { accountId: account.id }, _count: { _all: true }, _sum: { price: true } }),
      ])
      return {
        ...account,
        activeListings,
        totalSales: sales._count._all,
        totalRevenue: sales._sum.price ?? 0,
      }
    })
  )

  return NextResponse.json({ ok: true, accounts: withStats })
}
