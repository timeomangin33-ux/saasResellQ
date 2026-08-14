import { PrismaClient } from '@prisma/client'

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
