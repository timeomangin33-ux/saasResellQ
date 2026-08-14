import { PrismaClient } from '@prisma/client'

// Ensure DATABASE_URL is defined — allow several common fallback env names.
const fallbackSources = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRESQL_URL',
  'POSTGRES_PRISMA_URL',
  'PG_CONNECTION_STRING',
  'SUPABASE_DATABASE_URL',
]

if (!process.env.DATABASE_URL) {
  for (const key of fallbackSources) {
    if (key === 'DATABASE_URL') continue
    const v = process.env[key]
    if (v) {
      // Do not print the URL value (secrets). Only warn that a fallback was used.
      // This helps Vercel logs show which env var was present.
      // eslint-disable-next-line no-console
      console.warn(`[prisma] DATABASE_URL not set, using fallback from ${key}`)
      process.env.DATABASE_URL = v
      break
    }
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// If using Prisma Data Proxy (DATABASE_URL starts with prisma://) it's
// safe and beneficial to cache the client even in production so multiple
// serverless invocations reuse the same PrismaClient instance.
if (process.env.DATABASE_URL?.startsWith('prisma://')) {
  globalForPrisma.prisma = prisma
}
