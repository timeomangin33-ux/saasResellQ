import { automationQueue, productSyncQueue, analysisQueue, watchlistQueue } from '@/lib/queues'
import { prisma } from '@/prisma'
import { callAgent } from '@/lib/n8n-agents'
import { AGENTS } from '@/lib/n8n-agents'
import vintedConnector from '@/lib/vinted-connector'

/**
 * Initialize all job processors
 * Call this once on server startup
 */
export async function initializeJobProcessors() {
  // Process automation jobs
  automationQueue.process(async (job) => {
    const { type, userId, payload } = job.data

    switch (type) {
      case 'sync-products':
        return await syncProductsJob(userId, payload)
      case 'sync-vinted':
        return await syncVintedJob(userId, payload)
      case 'analyze-products':
        return await analyzeProductsJob(userId, payload)
      case 'create-watchlist':
        return await createWatchlistJob(userId, payload)
      case 'notify-user':
        return await notifyUserJob(userId, payload)
      default:
        throw new Error(`Unknown automation job type: ${type}`)
    }
  })

  // Process product sync jobs
  productSyncQueue.process(async (job) => {
    return await productSyncWorker(job.data)
  })

  // Process analysis jobs
  analysisQueue.process(async (job) => {
    return await analysisWorker(job.data)
  })

  // Process watchlist creation jobs
  watchlistQueue.process(async (job) => {
    return await watchlistWorker(job.data)
  })

  // Error handling
  automationQueue.on('failed', async (job, err) => {
    console.error(`Job ${job.id} failed:`, err)
    // Log to database
    if (job.data.userId) {
      await prisma.automationJob.create({
        data: {
          userId: job.data.userId,
          jobType: job.data.type,
          status: 'failed',
          error: err.message,
          input: JSON.stringify(job.data),
        },
      })
    }
  })

  automationQueue.on('completed', async (job) => {
    console.log(`Job ${job.id} completed`)
  })

  console.log('✅ Job processors initialized')
}

/**
 * Sync products from N8N PostgreSQL to local Prisma
 */
async function syncProductsJob(userId: string | undefined, payload: any) {
  const startTime = Date.now()

  try {
    // Fetch products from N8N via the AI agent
    const n8nData = (await callAgent(AGENTS.productAnalyzer, {
      action: 'fetch_all_products',
      category: payload?.category,
      limit: payload?.limit || 100,
    })) as Record<string, any>

    if (!n8nData || !Array.isArray(n8nData.products)) {
      throw new Error('No products received from N8N')
    }

    // Sync products to Prisma
    const synced = await Promise.all(
      n8nData.products.map(async (product: any) => {
        return await prisma.product.upsert({
          where: { vintedId: product.id || product.vintedId },
          update: {
            title: product.title,
            price: product.price,
            category: product.category,
            subcategory: product.subcategory,
            brand: product.brand,
            condition: product.condition,
            profitMargin: product.profit_margin,
            profitPotential: product.profit_potential,
            imageUrl: product.image_url,
            url: product.url,
            status: product.status || 'active',
            updatedAt: new Date(),
          },
          create: {
            vintedId: product.id || product.vintedId,
            title: product.title,
            price: product.price,
            category: product.category,
            subcategory: product.subcategory,
            brand: product.brand,
            condition: product.condition,
            profitMargin: product.profit_margin,
            profitPotential: product.profit_potential,
            imageUrl: product.image_url,
            url: product.url,
            status: 'active',
          },
        })
      })
    )

    // Update category market data
    if (payload?.category) {
      const categoryStats = await calculateCategoryStats(payload.category)
      await prisma.categoryMarket.upsert({
        where: { category: payload.category },
        update: {
          ...categoryStats,
          lastAnalyzedAt: new Date(),
        },
        create: {
          category: payload.category,
          ...categoryStats,
        },
      })
    }

    return {
      status: 'success',
      synced: synced.length,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    throw new Error(`Product sync failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Analyze products for profitability
 */
async function analyzeProductsJob(userId: string | undefined, payload: any) {
  try {
    // Get products to analyze
    const products = await prisma.product.findMany({
      where: {
        aiProcessed: false,
        status: 'active',
      },
      take: payload?.limit || 50,
    })

    if (products.length === 0) {
      return { status: 'success', analyzed: 0, message: 'No products to analyze' }
    }

    // Call AI analyzer
    const analysisResults = (await callAgent(AGENTS.productAnalyzer, {
      products: products.map((p) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        category: p.category,
        brand: p.brand,
      })),
    })) as Record<string, any>

    // Update products with analysis
    const updatePromises = products.map((product) => {
      const analysis = analysisResults.results?.[product.id] || {}

      return prisma.product.update({
        where: { id: product.id },
        data: {
          analysisScore: analysis.score,
          riskLevel: analysis.risk_level,
          recommendation: analysis.recommendation,
          aiProcessed: true,
        },
      })
    })

    await Promise.all(updatePromises)

    return {
      status: 'success',
      analyzed: products.length,
    }
  } catch (error) {
    throw new Error(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Auto-create watchlists based on trends
 */
async function createWatchlistJob(userId: string | undefined, payload: any) {
  if (!userId) {
    throw new Error('userId required for watchlist creation')
  }

  try {
    // Get user's automation config
    const config = await prisma.automationConfig.findUnique({
      where: { userId },
    })

    if (!config?.autoCreateWatchlist) {
      return { status: 'skipped', reason: 'Auto-watchlist disabled' }
    }

    // Get top categories by trend
    const topCategories = await prisma.categoryMarket.findMany({
      where: {
        trendDirection: 'up',
      },
      orderBy: {
        avgMargin: 'desc',
      },
      take: 3,
    })

    // Create watchlists for trending categories
    const created = await Promise.all(
      topCategories.map((category) =>
        prisma.watchlist.create({
          data: {
            userId,
            name: `📈 ${category.category} - Auto (${new Date().toLocaleDateString()})`,
            query: category.category,
            category: category.category,
            minPrice: 10,
            maxPrice: 500,
          },
        })
      )
    )

    return {
      status: 'success',
      created: created.length,
      watchlists: created.map((w) => w.name),
    }
  } catch (error) {
    throw new Error(`Watchlist creation failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Send notifications to user
 */
async function notifyUserJob(userId: string | undefined, payload: any) {
  if (!userId) {
    throw new Error('userId required for notifications')
  }

  try {
    const { title, message, type = 'info' } = payload

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
    })

    // Call notification agent (email, Slack, etc.)
    if (type === 'alert') {
      await callAgent(AGENTS.notificationAgent, {
        user_id: userId,
        title,
        message,
        type: 'email',
      })
    }

    return {
      status: 'success',
      notificationId: notification.id,
    }
  } catch (error) {
    throw new Error(`Notification failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Worker functions for queue processors
 */
async function productSyncWorker(data: any) {
  return await syncProductsJob(undefined, data)
}

async function analysisWorker(data: any) {
  return await analyzeProductsJob(undefined, data)
}

async function watchlistWorker(data: any) {
  return await createWatchlistJob(data.userId, { category: data.category })
}

/**
 * Helper: Calculate category market statistics
 */
async function calculateCategoryStats(category: string) {
  const products = await prisma.product.findMany({
    where: { category },
  })

  if (products.length === 0) {
    return {}
  }

  const prices = products.map((p) => p.price).sort((a, b) => a - b)
  const margins = products.filter((p) => p.profitMargin).map((p) => p.profitMargin!)

  return {
    avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
    medianPrice: prices[Math.floor(prices.length / 2)],
    avgMargin: margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : undefined,
    volumeActive: products.filter((p) => p.status === 'active').length,
    volumeSold: products.filter((p) => p.status === 'sold').length,
  }
}

export {
  syncProductsJob,
  analyzeProductsJob,
  createWatchlistJob,
  notifyUserJob,
  syncVintedJob,
}

/**
 * Sync Vinted account for a user
 */
async function syncVintedJob(userId: string | undefined, payload: any) {
  if (!userId) throw new Error('userId required for vinted sync')

  const db: any = prisma
  const account = await db.vintedAccount.findFirst({ where: { userId } })
  if (!account) return { status: 'skipped', reason: 'no_vinted_account' }

  try {
    const { listings, sales } = await (vintedConnector as any).fetchAccountData(account)
    await (vintedConnector as any).persistFetchedData(account.id, listings || [], sales || [])

    // update derived stats (simple example)
    const summary = (vintedConnector as any).computeSummary(listings || [], sales || [])
    await db.vintedSync.create({ data: { accountId: account.id, summary: JSON.stringify(summary) } })

    return { status: 'success', listings: listings.length, sales: sales.length }
  } catch (err) {
    throw new Error(`Vinted sync failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}
