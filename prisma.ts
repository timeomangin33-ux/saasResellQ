import { PrismaClient } from '@prisma/client'

function resolveDatabaseEnv(): void {
  const preferredOrder = [
    'DATABASE_URL',
    'NEON_POSTGRES_URL',
    'NEON_POSTGRES_URL_NO_SSL',
    'NEON_POSTGRES_URL_NON_POOLING',
    'POSTGRES_URL',
    'POSTGRES_URL_NON_POOLING',
    'POSTGRES_PRISMA_URL',
    'POSTGRESQL_URL',
    'PG_CONNECTION_STRING',
    'SUPABASE_DATABASE_URL',
  ]

  const candidate = preferredOrder
    .map((key) => ({ key, value: process.env[key] }))
    .find(({ value }) => Boolean(value))

  if (!process.env.DATABASE_URL && candidate?.value) {
    // eslint-disable-next-line no-console
    console.warn(`[prisma] DATABASE_URL not set, using fallback from ${candidate.key}`)
    process.env.DATABASE_URL = candidate.value
  }

  if (!process.env.DATABASE_URL_UNPOOLED) {
    const unpooledCandidate = [
      'DATABASE_URL_UNPOOLED',
      'NEON_POSTGRES_URL_NON_POOLING',
      'NEON_POSTGRES_URL_NO_SSL',
      'POSTGRES_URL_NON_POOLING',
      'POSTGRES_URL_NO_SSL',
      'POSTGRES_PRISMA_URL',
    ]
      .map((key) => process.env[key])
      .find(Boolean)

    if (unpooledCandidate) {
      process.env.DATABASE_URL_UNPOOLED = unpooledCandidate
    }
  }

  if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
    process.env.POSTGRES_URL = process.env.DATABASE_URL
  }
}

resolveDatabaseEnv()

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
