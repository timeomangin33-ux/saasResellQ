import { prisma } from '@/prisma'
import type { VintedBotItem } from '@/lib/vinted-bot'

const CONDITION_MAP: Record<string, string> = {
  'très bon état': 'like_new',
  'bon état': 'good',
  'satisfaisant': 'fair',
  'neuf avec étiquette': 'new',
  'neuf sans étiquette': 'new',
}

function normalizeCondition(rawState: string) {
  const key = rawState.toLowerCase().trim()
  return CONDITION_MAP[key] ?? 'good'
}

function pctChange(next: number, prev: number | null | undefined) {
  if (prev === null || prev === undefined || prev === 0) return null
  return ((next - prev) / prev) * 100
}

/**
 * Persists live-scraped Vinted items into the Product table and refreshes
 * the CategoryMarket aggregate for that category, so the rest of the app
 * (top-products, top-categories, opportunities...) reflects real scan data.
 */
export async function persistVintedScanResults(items: VintedBotItem[], category: string) {
  if (items.length === 0) return { productsWritten: 0 }

  for (const item of items) {
    const [state] = item.description.split(' • ')
    await prisma.product.upsert({
      where: { vintedId: item.id },
      update: {
        title: item.title,
        price: item.price,
        category,
        brand: item.brand,
        condition: normalizeCondition(state || ''),
        imageUrl: item.image,
        url: item.url,
        status: 'active',
        updatedAt: new Date(),
      },
      create: {
        vintedId: item.id,
        title: item.title,
        price: item.price,
        category,
        brand: item.brand,
        condition: normalizeCondition(state || ''),
        imageUrl: item.image,
        url: item.url,
        status: 'active',
      },
    })
  }

  const activeProducts = await prisma.product.findMany({
    where: { category, status: 'active' },
    select: { price: true },
  })

  if (activeProducts.length > 0) {
    const prices = activeProducts.map((p) => p.price).sort((a, b) => a - b)
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
    const medianPrice = prices[Math.floor(prices.length / 2)]
    const volumeActive = activeProducts.length

    const previous = await prisma.categoryMarket.findUnique({ where: { category } })
    const priceChangePercent = pctChange(avgPrice, previous?.avgPrice)
    const volumeChangePercent = pctChange(volumeActive, previous?.volumeActive)
    const trendDirection = priceChangePercent === null ? 'stable' : priceChangePercent > 2 ? 'up' : priceChangePercent < -2 ? 'down' : 'stable'

    await prisma.categoryMarket.upsert({
      where: { category },
      update: {
        avgPrice,
        medianPrice,
        volumeActive,
        trendDirection,
        priceChangePercent,
        volumeChangePercent,
        lastAnalyzedAt: new Date(),
      },
      create: {
        category,
        avgPrice,
        medianPrice,
        volumeActive,
        trendDirection,
        priceChangePercent,
        volumeChangePercent,
        lastAnalyzedAt: new Date(),
      },
    })
  }

  return { productsWritten: items.length }
}
