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

  const access = await authorizeFeature(request, 'STARTER')
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
    const prev30Start = new Date(now.getTime() - 60 * msDay)

    const revenueToday = sales.filter((s: any) => new Date(s.soldAt).toDateString() === now.toDateString()).reduce((a: number, b: any) => a + Number(b.price), 0)
    const revenue7 = sales.filter((s: any) => new Date(s.soldAt) >= last7).reduce((a: number, b: any) => a + Number(b.price), 0)
    const revenue30 = sales.filter((s: any) => new Date(s.soldAt) >= last30).reduce((a: number, b: any) => a + Number(b.price), 0)

    // Period-over-period comparison (last 30 days vs the 30 days before that) — only
    // returned when there is enough history to compute an honest comparison.
    const salesLast30 = sales.filter((s: any) => new Date(s.soldAt) >= last30)
    const salesPrev30 = sales.filter((s: any) => {
      const soldAt = new Date(s.soldAt)
      return soldAt >= prev30Start && soldAt < last30
    })
    const revenuePrev30 = salesPrev30.reduce((a: number, b: any) => a + Number(b.price || 0), 0)
    const avgPriceLast30 = salesLast30.length ? revenue30 / salesLast30.length : 0
    const avgPricePrev30 = salesPrev30.length ? revenuePrev30 / salesPrev30.length : 0

    function pctDelta(current: number, previous: number): number | null {
      if (!previous) return null
      return Math.round(((current - previous) / previous) * 1000) / 10
    }

    const deltas = {
      revenue: pctDelta(revenue30, revenuePrev30),
      sales: pctDelta(salesLast30.length, salesPrev30.length),
      avgPrice: pctDelta(avgPriceLast30, avgPricePrev30),
    }

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

    // Daily revenue series for the last 30 days, oldest first, for charting.
    const seriesDays = 30
    const series = Array.from({ length: seriesDays }, (_, i) => {
      const dayStart = new Date(now)
      dayStart.setHours(0, 0, 0, 0)
      dayStart.setDate(dayStart.getDate() - (seriesDays - 1 - i))
      const dayEnd = new Date(dayStart.getTime() + msDay)
      const dayRevenue = sales
        .filter((s: any) => {
          const soldAt = new Date(s.soldAt)
          return soldAt >= dayStart && soldAt < dayEnd
        })
        .reduce((sum: number, s: any) => sum + Number(s.price || 0), 0)

      return {
        date: dayStart.toISOString().slice(0, 10),
        label: dayStart.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        revenue: Math.round(dayRevenue * 100) / 100,
      }
    })

    return NextResponse.json({
      connected: true,
      username: account.username ?? null,
      lastSyncAt: account.lastSyncAt ?? null,
      totalRevenue,
      totalSales,
      activeListings,
      soldListings,
      avgPrice,
      revenueToday,
      revenue7,
      revenue30,
      deltas,
      topCategories,
      topBrands,
      series,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Erreur' }, { status: 500 })
  }
}
