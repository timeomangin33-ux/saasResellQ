import { prisma } from '@/prisma'
import { runVintedBotScan } from '@/lib/vinted-bot'
import { persistVintedScanResults } from '@/lib/market-sync'
import { scoreProducts } from '@/lib/ai-scoring'
import { VINTED_CATEGORIES } from '@/vinted'

/**
 * Real, synchronous implementations of the automation actions. These used to
 * be pushed onto a Bull/Redis queue, but no worker process ever consumed
 * that queue on this serverless deployment (no REDIS_URL configured, no
 * process ever calls the old initializeJobProcessors()) — jobs sat as
 * "pending" forever. Running them directly means the UI reflects what
 * actually happened.
 */

export async function runProductSync(payload: { limit?: number } = {}) {
  const categories = VINTED_CATEGORIES.slice(0, 6)
  const parCategorie = Math.min(96, Math.max(24, payload.limit ?? 96))
  let totalItems = 0
  let echecs = 0
  const details: { category: string; source: string; items: number; error?: string }[] = []

  for (const category of categories) {
    try {
      const scan = await runVintedBotScan({
        query: category.name,
        perPage: parCategorie,
        category: category.name,
      })

      if (scan.success && scan.items.length > 0) {
        const bilan = await persistVintedScanResults(scan.items, category.name)
        totalItems += bilan.annoncesEcrites
        details.push({ category: category.name, source: scan.source, items: bilan.annoncesEcrites })
      } else {
        echecs += 1
        details.push({ category: category.name, source: scan.source, items: 0, error: scan.message })
      }
    } catch (err) {
      echecs += 1
      details.push({
        category: category.name,
        source: 'error',
        items: 0,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // Une synchronisation où tout echoue doit se lire comme un echec. Elle
  // rendait « synced: 0 » avec un air de succes, et l'interface affichait
  // « synchronisation terminee ».
  return {
    synced: totalItems,
    categoriesScanned: details.length,
    failures: echecs,
    ok: echecs < details.length,
    details,
  }
}

export async function runProductAnalysis(payload: { limit?: number } = {}) {
  const limit = Math.min(payload.limit ?? 30, 50)
  const products = await prisma.product.findMany({
    where: { aiProcessed: false, status: 'active' },
    take: limit,
  })

  if (products.length === 0) {
    return { analyzed: 0, message: 'Aucun produit en attente d\'analyse.' }
  }

  const result = await scoreProducts(
    products.map((p) => ({ vintedId: p.vintedId, title: p.title, brand: p.brand, price: p.price, category: p.category })),
  )

  return { analyzed: result.scored, total: products.length }
}

export async function runCreateWatchlists(userId: string, payload: { categories?: string[] } = {}) {
  const trending = payload.categories?.length
    ? await prisma.categoryMarket.findMany({ where: { category: { in: payload.categories } } })
    : await prisma.categoryMarket.findMany({
        where: { trendDirection: 'up' },
        orderBy: [{ priceChangePercent: 'desc' }],
        take: 3,
      })

  if (trending.length === 0) {
    return { created: 0, skipped: 0, watchlists: [], message: 'Aucune catégorie en tendance haussière pour le moment.' }
  }

  const existing = await prisma.watchlist.findMany({
    where: { userId, category: { in: trending.map((t) => t.category) } },
    select: { category: true },
  })
  const existingSet = new Set(existing.map((e) => e.category))
  const toCreate = trending.filter((t) => !existingSet.has(t.category))

  const created = await Promise.all(
    toCreate.map((t) =>
      prisma.watchlist.create({
        data: {
          userId,
          name: `📈 ${t.category} — tendance haussière`,
          query: t.category,
          category: t.category,
          minPrice: 5,
          maxPrice: 1000,
        },
      }),
    ),
  )

  return {
    created: created.length,
    skipped: trending.length - toCreate.length,
    watchlists: created.map((w) => w.name),
  }
}

export async function runNotifyUser(userId: string, payload: { title: string; message: string; type?: string }) {
  const notification = await prisma.notification.create({
    data: { userId, title: payload.title, message: payload.message, type: payload.type || 'info' },
  })
  return { notified: true, notificationId: notification.id }
}

const RUNNERS: Record<string, (userId: string, payload: any) => Promise<Record<string, unknown>>> = {
  'sync-products': (_userId, payload) => runProductSync(payload),
  'analyze-products': (_userId, payload) => runProductAnalysis(payload),
  'create-watchlist': (userId, payload) => runCreateWatchlists(userId, payload),
  'notify-user': (userId, payload) => runNotifyUser(userId, payload),
}

/**
 * Runs a job type synchronously and records the outcome in AutomationJob,
 * matching the shape the old Bull-based flow used to leave in the DB.
 */
export async function runAutomationJob(userId: string, jobType: string, payload: Record<string, unknown> = {}) {
  const runner = RUNNERS[jobType]
  if (!runner) {
    throw new Error(`Type de job inconnu : ${jobType}`)
  }

  const job = await prisma.automationJob.create({
    data: { userId, jobType, status: 'running', input: JSON.stringify(payload), lastRunAt: new Date() },
  })

  try {
    const result = await runner(userId, payload)
    await prisma.automationJob.update({
      where: { id: job.id },
      data: { status: 'completed', result: JSON.stringify(result) },
    })
    return { jobId: job.id, status: 'completed', result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    await prisma.automationJob.update({
      where: { id: job.id },
      data: { status: 'failed', error: message },
    })
    throw error
  }
}
