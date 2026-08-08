import { NextResponse } from 'next/server'
import { authorizeFeature } from '@/lib/access-control'
import { prisma } from '@/prisma'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const rateLimit = checkRateLimit(`vinted-dashboard:${ip}`, 15, 60_000)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes, réessayez plus tard.' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } })
  }

  const access = await authorizeFeature('STARTER')
  if ('response' in access) return access.response

  const user = access.user

  try {
    const db: any = prisma
    const account = await db.vintedAccount.findFirst({ where: { userId: user.id } })
    if (!account) return NextResponse.json({ error: 'Aucun compte Vinted lié' }, { status: 404 })

    const sales = await db.vintedSale.findMany({ where: { accountId: account.id }, orderBy: { soldAt: 'desc' } })
    const listings = await db.vintedListing.findMany({ where: { accountId: account.id } })

    const totalRevenue = sales.reduce((s: number, x: any) => s + Number(x.price || 0), 0)
    const totalSales = sales.length
    const activeListings = listings.filter((l: any) => !l.sold).length
    const soldListings = listings.filter((l: any) => l.sold).length
    const avgPrice = totalSales ? totalRevenue / totalSales : 0

    // basic time-window aggregates
    const now = new Date()
    const msDay = 1000 * 60 * 60 * 24
    const last7 = new Date(now.getTime() - 7 * msDay)
    const last30 = new Date(now.getTime() - 30 * msDay)

    const revenueToday = sales.filter((s: any) => new Date(s.soldAt).toDateString() === now.toDateString()).reduce((a: number, b: any) => a + Number(b.price), 0)
    const revenue7 = sales.filter((s: any) => new Date(s.soldAt) >= last7).reduce((a: number, b: any) => a + Number(b.price), 0)
    const revenue30 = sales.filter((s: any) => new Date(s.soldAt) >= last30).reduce((a: number, b: any) => a + Number(b.price), 0)

    // top categories / brands
    const byCategory: Record<string, number> = {}
    const byBrand: Record<string, number> = {}
    for (const s of sales) {
      const listing = await db.vintedListing.findUnique({ where: { vintedId: s.listingId ?? '' } })
      if (listing) {
        if (listing.category) byCategory[listing.category] = (byCategory[listing.category] || 0) + 1
        if (listing.brand) byBrand[listing.brand] = (byBrand[listing.brand] || 0) + 1
      }
    }

    const topCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const topBrands = Object.entries(byBrand).sort((a, b) => b[1] - a[1]).slice(0, 5)

    return NextResponse.json({
      totalRevenue,
      totalSales,
      activeListings,
      soldListings,
      avgPrice,
      revenueToday,
      revenue7,
      revenue30,
      topCategories,
      topBrands,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Erreur' }, { status: 500 })
  }
}
