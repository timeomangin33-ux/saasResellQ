import Queue from 'bull'
import { createClient } from 'redis'

// Redis connection (uses local Redis or will mock if not available)
const redisConfig = {
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  password: process.env.REDIS_PASSWORD || undefined,
}

export const redisClient = createClient(redisConfig)

// Define Job Queues
export const automationQueue = new Queue('automation', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
})

export const productSyncQueue = new Queue('product-sync', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
})

export const analysisQueue = new Queue('analysis', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
})

export const watchlistQueue = new Queue('watchlist', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
})

// Job Types
export interface AutomationJobData {
  type: 'sync-products' | 'analyze-products' | 'create-watchlist' | 'notify-user'
  userId?: string
  payload?: Record<string, unknown>
}

export interface ProductSyncJobData {
  category?: string
  limit?: number
  forceRefresh?: boolean
}

export interface AnalysisJobData {
  productIds?: string[]
  category?: string
  minMargin?: number
}

export interface WatchlistJobData {
  userId: string
  name: string
  category?: string
  query?: string
  minMargin?: number
  riskLevel?: string
}
